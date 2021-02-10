#!/usr/bin/env python

"""
update_prescriptions.py

Usage:
  update_prescriptions.py API_BASE_URL
"""
import os
import glob
import json
import uuid
import requests
from datetime import date, datetime, timedelta
from docopt import docopt

examples_root_dir = "../models/examples/"
api_prefix_url = "FHIR/R4"


def generate_short_form_id(organisationCode):
    """Create R2 (short format) Prescription ID
    Build the prescription ID and add the required checkdigit.
    Checkdigit is selected from the PRESCRIPTION_CHECKDIGIT_VALUES constant
    """
    _PRESCRIPTION_CHECKDIGIT_VALUES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+'
    hex_string = str(uuid.uuid1()).replace('-', '').upper()
    prescription_id = f'{hex_string[:6]}-{organisationCode}-{hex_string[12:17]}'
    prescription_id_digits = prescription_id.replace('-', '')
    prescription_id_digits_length = len(prescription_id_digits)
    running_total = 0
    for string_position in range(prescription_id_digits_length):
        running_total = running_total\
            + int(prescription_id_digits[string_position], 36)\
            * (2 ** (prescription_id_digits_length - string_position))
    check_value = (38 - running_total % 37) % 37
    check_value = _PRESCRIPTION_CHECKDIGIT_VALUES[check_value]
    prescription_id += check_value
    return prescription_id


def find_prepare_request_paths(examples_root_dir):
    for filename in glob.iglob(f'{examples_root_dir}**/*Prepare-Request*200_OK*.json', recursive=True):
        yield filename


def update_prescription(bundle_json, prescription_id, short_prescription_id, authored_on, signature_time):
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "Provenance":
            for signature in resource["signature"]:
                signature["when"] = signature_time
        if resource["resourceType"] == "MedicationRequest":
            resource["groupIdentifier"]["value"] = short_prescription_id
            for extension in resource["groupIdentifier"]["extension"]:
                if extension["url"] == "https://fhir.nhs.uk/R4/StructureDefinition/Extension-PrescriptionId":
                    extension["valueIdentifier"]["value"] = prescription_id
            resource["authoredOn"] = authored_on
            if "validityPeriod" in resource["dispenseRequest"]:
                resource["dispenseRequest"]["validityPeriod"]["start"] = date.today().isoformat()
                resource["dispenseRequest"]["validityPeriod"]["end"] = (date.today() + timedelta(weeks=4)).isoformat()


def update_prepare_examples(api_base_url, prepare_request_path, prescription_id, authored_on):
    with open(prepare_request_path) as f:
        prepare_request_json = json.load(f)

    for entry in prepare_request_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "HealthcareService":
            for identifier in resource["identifier"]:
                organisationCode = identifier["value"]
                short_prescription_id = generate_short_form_id(organisationCode)

    update_prescription(prepare_request_json, prescription_id, short_prescription_id, authored_on, None)

    with open(prepare_request_path, 'w') as f:
        json.dump(prepare_request_json, f, indent=2)

    prepare_response_json = requests.post(
        f'{api_base_url}/{api_prefix_url}/$prepare',
        data=json.dumps(prepare_request_json),
        headers={'Content-Type': 'application/json', 'X-Request-ID': str(uuid.uuid4())}
    ).json()

    prepare_response_path = derive_prepare_response_path(prepare_request_path)
    with open(prepare_response_path, 'w') as f:
        json.dump(prepare_response_json, f, indent=2)

    for parameter in prepare_response_json["parameter"]:
        if parameter["name"] == "timestamp":
            return short_prescription_id, parameter["valueString"]


def update_process_examples(
    api_base_url, prepare_request_path, prescription_id, short_prescription_id, authored_on, signature_time
):
    process_request_path_pattern = derive_process_request_path_pattern(prepare_request_path)
    for process_request_path in glob.iglob(process_request_path_pattern):
        with open(process_request_path) as f:
            process_request_json = json.load(f)
        update_prescription(
            process_request_json, prescription_id, short_prescription_id, authored_on, signature_time
        )
        with open(process_request_path, 'w') as f:
            json.dump(process_request_json, f, indent=2)

        convert_response_xml = requests.post(
            f'{api_base_url}/{api_prefix_url}/$convert',
            data=json.dumps(process_request_json),
            headers={'Content-Type': 'application/json', 'X-Request-ID': str(uuid.uuid4())}
        ).text

        convert_response_path = derive_convert_response_path(process_request_path)
        with open(convert_response_path, 'w') as f:
            f.write(convert_response_xml)


def derive_prepare_response_path(prepare_request_path):
    example_dir = os.path.dirname(prepare_request_path)
    file = os.path.basename(prepare_request_path)
    filename_parts = file.split('-')
    number = filename_parts[0]
    status_code_and_ext = filename_parts[-1]
    return f'{example_dir}/{number}-Prepare-Response-{status_code_and_ext}'


def derive_process_request_path_pattern(prepare_request_path):
    example_dir = os.path.dirname(prepare_request_path)
    file = os.path.basename(prepare_request_path)
    filename_parts = file.split('-')
    number = filename_parts[0]
    status_code_and_ext = filename_parts[-1]
    return f'{example_dir}/{number}-Process-Request-*-{status_code_and_ext}'


def derive_convert_response_path(process_request_path):
    example_dir = os.path.dirname(process_request_path)
    file = os.path.basename(process_request_path)
    filename_parts = file.split('-')
    number = filename_parts[0]
    operation = filename_parts[3]
    status_code_and_ext = filename_parts[-1]
    status_code_and_xml_ext = status_code_and_ext.replace("json", "xml")
    return f'{example_dir}/{number}-Convert-Response-{operation}-{status_code_and_xml_ext}'


def update_examples(api_base_url):
    authored_on = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S+00:00')

    for prepare_request_path in find_prepare_request_paths(examples_root_dir):
        prescription_id = str(uuid.uuid4())

        short_prescription_id, signature_time = update_prepare_examples(
            api_base_url, prepare_request_path, prescription_id, authored_on
        )
        update_process_examples(
            api_base_url, prepare_request_path, prescription_id, short_prescription_id, authored_on,
            signature_time
        )


def main(arguments):
    arguments = docopt(__doc__, version="0")
    update_examples(arguments["API_BASE_URL"])


if __name__ == "__main__":
    main(arguments=docopt(__doc__, version="0"))


def test_generate_short_form_id__contains_org_code():
    assert generate_short_form_id("testOrgCode").split("-")[1] == "testOrgCode"


def test_find_prepare_request_paths__finds_prepare_examples():
    examples_root_dir = "./models/examples/"
    for prepareRequest in find_prepare_request_paths(examples_root_dir):
        break
    else:
        raise Exception('Failed to find any prepare examples')


def test_update_prescription__updates_prescription_id():
    bundle_json = {
        "entry": [
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "groupIdentifier": {
                        "value": "valueToUpdate",
                        "extension": []
                    },
                    "dispenseRequest": {}
                }
            }
        ]
    }
    prescription_id = "newValue"
    update_prescription(
        bundle_json, prescription_id, None, None, None
    )
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            for extension in resource["groupIdentifier"]["extension"]:
                if extension["url"] == "https://fhir.nhs.uk/R4/StructureDefinition/Extension-PrescriptionId":
                    assert extension["valueIdentifier"]["value"] == prescription_id
            break
    else:
        raise Exception('Failed to update short_prescription_id on MedicationRequest')


def test_update_prescription__updates_short_prescription_id():
    bundle_json = {
        "entry": [
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "groupIdentifier": {
                        "value": "valueToUpdate",
                        "extension": []
                    },
                    "dispenseRequest": {}
                }
            }
        ]
    }
    short_prescription_id = "newValue"
    update_prescription(
        bundle_json, None, short_prescription_id, None, None
    )
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            assert resource["groupIdentifier"]["value"] == short_prescription_id
        break
    else:
        raise Exception('Failed to update short_prescription_id on MedicationRequest')


def test_update_prescription__updates_signature_time():
    bundle_json = {
        "entry": [
            {
                "resource": {
                    "resourceType": "Provenance",
                    "signature": [
                        {"when": "oldValue"}
                    ]
                }
            }
        ]
    }
    signature_time = "newValue"
    update_prescription(
        bundle_json, None, None, None, signature_time
    )
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "Provenance":
            for signature in resource["signature"]:
                assert signature["when"] == signature_time
        break
    else:
        raise Exception('Failed to update signature_time on Provenance')

def test_update_prescription__updates_authored_on():
    bundle_json = {
        "entry": [
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "groupIdentifier": {
                        "value": "valueToUpdate",
                        "extension": []
                    },
                    "authoredOn": "oldValue",
                    "dispenseRequest": {}
                }
            }
        ]
    }
    authored_on = "newValue"
    update_prescription(
        bundle_json, None, None, authored_on, None
    )
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            assert resource["authoredOn"] == authored_on
            break
    else:
        raise Exception('Failed to update authored_on on MedicationRequest')


def test_update_prescription__updates_validity_period():
    bundle_json = {
        "entry": [
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "groupIdentifier": {
                        "value": "",
                        "extension": []
                    },
                    "dispenseRequest": {
                         "validityPeriod": {
                            "start": {"valueToUpdate"},
                            "end": {"valueToUpdate"}
                        }
                    }
                }
            }
        ]
    }
    update_prescription(
        bundle_json, None, None, None, None
    )
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            if "validityPeriod" in resource["dispenseRequest"]:
                assert resource["dispenseRequest"]["validityPeriod"]["start"] == date.today().isoformat()
                assert resource["dispenseRequest"]["validityPeriod"]["end"] == (date.today() + timedelta(weeks=4)).isoformat()
            break
    else:
        raise Exception('Failed to update validity_period on MedicationRequest')
