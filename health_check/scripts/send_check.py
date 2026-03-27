#!/usr/bin/env python3
"""
send_check.py <schedule_name>
- Reads token from health_check/.token
- Sends the health-check DM to the configured recipient
- Polls briefly for a reply and writes a timestamped JSON entry to health_check/data/YYYY-MM-DD.json
"""
import os, sys, json, time
from datetime import datetime
import subprocess

WORKDIR = os.path.dirname(os.path.dirname(__file__))
TOKEN_PATH = os.path.join(WORKDIR, '.token')
RECIPIENT_ID = os.environ.get('HEALTH_RECIPIENT_ID', '1483452991322325053')
BASE = 'https://discord.com/api/v10'

if not os.path.exists(TOKEN_PATH):
    print('token not found at', TOKEN_PATH, file=sys.stderr)
    sys.exit(1)

with open(TOKEN_PATH,'r') as f:
    TOKEN = f.read().strip()

# guard: do not resend if we already sent recently today for this schedule
fn_today = os.path.join(DATA_DIR, datetime.utcnow().strftime('%Y-%m-%d') + '.json')
if os.path.exists(fn_today):
    try:
        prev = json.load(open(fn_today))
        # if last entry for the same schedule is within 12 hours, skip sending
        for e in reversed(prev):
            if e.get('schedule') == (sys.argv[1] if len(sys.argv)>1 else 'health_check'):
                # parse timestamp
                try:
                    t = datetime.fromisoformat(e.get('timestamp').replace('Z','+00:00'))
                    age_hours = (datetime.utcnow() - t.replace(tzinfo=None)).total_seconds()/3600.0
                    if age_hours < 12:
                        print('Recent check-in exists (sent %.1f hours ago); skipping' % age_hours)
                        sys.exit(0)
                except Exception:
                    pass
                break
    except Exception:
        pass

# create DM channel
create_cmd = [
    'curl','-s', '-H', f'Authorization: Bot {TOKEN}', '-H', 'Content-Type: application/json',
    '-X','POST','-d', json.dumps({'recipient_id': RECIPIENT_ID}), f'{BASE}/users/@me/channels'
]
create = subprocess.check_output(create_cmd)
try:
    chan = json.loads(create.decode())['id']
except Exception as e:
    print('failed to create dm channel', e, create, file=sys.stderr)
    sys.exit(1)

# send message payload
prompts = [
  "What did you eat?",
  "How are your lungs feeling?",
  "How's your general mood?",
  "Have you exercised today? If yes, when?"
]
message_text = 'Health check-in:\n' + '\n'.join(f'- {p}' for p in prompts) + '\n\nReply to this message with your answers.'
msg_payload = {'content': message_text}
send_cmd = ['curl','-s','-H',f'Authorization: Bot {TOKEN}','-H','Content-Type: application/json','-X','POST','-d', json.dumps(msg_payload), f'{BASE}/channels/{chan}/messages']
send = subprocess.check_output(send_cmd)
# record the outbound message id if available
try:
    sent_obj = json.loads(send.decode())
    outbound_id = sent_obj.get('id')
except Exception:
    outbound_id = None

# poll for a reply (300 seconds)
end = time.time() + 300
collected = []
while time.time() < end:
    msgs_cmd = ['curl','-s','-H',f'Authorization: Bot {TOKEN}', f'{BASE}/channels/{chan}/messages?limit=50']
    msgs = subprocess.check_output(msgs_cmd)
    try:
        arr = json.loads(msgs.decode())
    except Exception:
        arr = []
    for m in arr:
        if m.get('author',{}).get('id') == RECIPIENT_ID:
            collected.append({'timestamp': m.get('timestamp'), 'content': m.get('content')})
    if collected:
        break
    time.sleep(3)

# write to data file
now = datetime.utcnow().isoformat() + 'Z'
DATA_DIR = os.path.join(WORKDIR,'data')
STRUCT_DIR = os.path.join(WORKDIR,'structured')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STRUCT_DIR, exist_ok=True)
fn = datetime.utcnow().strftime('%Y-%m-%d') + '.json'
path = os.path.join(DATA_DIR, fn)
entry = {
    'timestamp': now,
    'schedule': sys.argv[1] if len(sys.argv)>1 else 'health_check',
    'outbound_message_id': outbound_id,
    'prompts_sent': prompts,
    'responses': collected
}
# append raw entry
if os.path.exists(path):
    try:
        existing = json.load(open(path))
    except Exception:
        existing = []
else:
    existing = []
existing.append(entry)
with open(path,'w') as f:
    json.dump(existing, f, indent=2)
print('wrote', path)

# build structured entry heuristically from collected responses
structured = {
    'timestamp': now,
    'prompts_sent': prompts,
    'raw_responses': collected,
    'meal_text': None,
    'lung_rating': None,
    'mood_rating': None,
    'exercised': False,
    'exercise_entries': [],
    'sleep_start': None,
    'sleep_duration_minutes': None,
    'notes': None
}
# combine collected text
texts = ' '.join([r.get('content','') for r in collected if r.get('content')])
structured['notes'] = texts
# parse lungs
import re
m = re.search(r'lung[s]?\D{0,8}(\d{1,2})', texts, re.I)
if not m:
    m = re.search(r'(\d{1,2})\s*out of\s*10', texts, re.I)
if m:
    try:
        structured['lung_rating'] = int(m.group(1))
    except:
        pass
# parse mood
mm = re.search(r'mood\D{0,8}(\d{1,2})', texts, re.I)
if mm:
    try:
        structured['mood_rating'] = int(mm.group(1))
    except:
        pass
# parse exercise durations
for mm in re.finditer(r'((?:rode|ride|walk|run|bike|exercise)[^\d,\.|;:]*)?(\d{1,3})\s*minutes?', texts, re.I):
    typ = mm.group(1) or ''
    mins = int(mm.group(2))
    structured['exercised'] = True
    structured['exercise_entries'].append({'type': typ.strip() or 'exercise','minutes': mins})
# parse single mentions of ride/walk without minutes
if not structured['exercised'] and re.search(r'\b(ride|rode|walk|run|bike)\b', texts, re.I):
    structured['exercised'] = True
# parse sleep
ms = re.search(r'slept(?: for)?\s*(\d{1,2})\s*hours?(?:\s*(\d{1,2})\s*minutes?)?', texts, re.I)
if ms:
    h=int(ms.group(1)); m2=ms.group(2)
    mins=int(m2) if m2 else 0
    structured['sleep_duration_minutes'] = h*60 + mins
m2 = re.search(r'(fell asleep at|slept at|sleep at)\s*([0-2]?\d(?::[0-5]\d)?\s*(?:am|pm)?)', texts, re.I)
if m2:
    structured['sleep_start'] = m2.group(2).strip()

# append structured entry to structured dir file
sfn = os.path.join(STRUCT_DIR, fn)
if os.path.exists(sfn):
    try:
        sex = json.load(open(sfn))
    except:
        sex = []
else:
    sex = []
sex.append(structured)
with open(sfn,'w') as sf:
    json.dump(sex, sf, indent=2)
print('wrote structured', sfn)
