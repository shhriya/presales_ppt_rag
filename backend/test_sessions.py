import sys
sys.path.append('.')
from routers.sessions import my_sessions

# Test the my_sessions function
try:
    result = my_sessions(x_user_id=1)
    print('Sessions API test successful')
    print(f'Found {len(result.get("sessions", []))} sessions')
    for session in result.get('sessions', []):
        print(f'Session: {session["session_id"]}, items_count: {session.get("items_count", 0)}, name: {session.get("name", "")}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
