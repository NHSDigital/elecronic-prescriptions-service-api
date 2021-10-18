import json
import os
import httpx
from cookies import get_session_cookie_value


HAPI_URL = os.environ["HAPI_URL"]
STATUS_URL = "/_status"
HEALTHCHECK_URL = "/_healthcheck"
EDIT_URL = "/prescribe/edit"
SIGN_URL = "/prescribe/sign"
SEND_URL = "/prescribe/send"
AUTH_URL = "/login"


def get_status():
    return httpx.get(
        f"{HAPI_URL}{STATUS_URL}",
        verify=False,
    ).json()


def get_healthcheck():
    return httpx.get(
        f"{HAPI_URL}{HEALTHCHECK_URL}",
        verify=False,
    ).json()


def get_edit(prescription_id):
    session_cookie_value = get_session_cookie_value()
    return httpx.get(
        f"{HAPI_URL}{EDIT_URL}?{prescription_id}",
        verify=False,
        cookies={
            "session": session_cookie_value
        }
    ).json()


def post_edit(body):
    # when in local mode, we might not have session cookie at this point
    # as we've skipped login, so ensure it is set here
    session_cookie_value = get_session_cookie_value()
    if session_cookie_value:
        cookies = {
            "session": session_cookie_value 
        }
    else:
        cookies = {}
    response = httpx.post(
        f"{HAPI_URL}{EDIT_URL}",
        json=body,
        verify=False,
        cookies=cookies
    )
    session_cookie_value = response.cookies["session"]
    return session_cookie_value, response.json()


def post_sign():
    session_cookie_value = get_session_cookie_value()
    return httpx.post(
        f"{HAPI_URL}{SIGN_URL}",
        json={},
        verify=False,
        cookies={
            "session": session_cookie_value
        }
    ).json()


def get_send():
    session_cookie_value = get_session_cookie_value()
    return httpx.get(
        f"{HAPI_URL}{SEND_URL}",
        verify=False,
        cookies={
            "session": session_cookie_value
        }
    ).json()


def post_send():
    session_cookie_value = get_session_cookie_value()
    return httpx.post(
        f"{HAPI_URL}{SEND_URL}",
        json={},
        verify=False,
        cookies={
            "session": session_cookie_value
        }
    ).json()


def get_login():
    session_cookie_value = get_session_cookie_value()
    return httpx.get(
        f"{HAPI_URL}{AUTH_URL}",
        verify=False,
        cookies={
            "session": session_cookie_value
        }
    ).json()


def post_login(access_token):
    response =  httpx.post(
        f"{HAPI_URL}{AUTH_URL}",
        json={
            "access_token": access_token
        },
        verify=False
    )
    session_cookie_value = response.cookies["session"]
    return session_cookie_value, response.json()


def get_prescription_ids(hapi_session_key):
    cookies = {
        "session": hapi_session_key
    }
    return make_get_request_raw(f"{HAPI_URL}/prescriptionIds", cookies)

# Helpers

def make_get_request_raw(url, cookies=None):
    if cookies is None:
        cookies = get_cookies()
    return httpx.get(url, verify=False, cookies=cookies).json()