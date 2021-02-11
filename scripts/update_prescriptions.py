#!/usr/bin/env python

"""
update_prescriptions.py

Usage:
  update_prescriptions.py API_BASE_URL
"""
import glob
import json
import os
import pytest
import requests
import uuid
from datetime import date, datetime, timedelta
from docopt import docopt

examples_root_dir = f"..{os.path.sep}models{os.path.sep}examples{os.path.sep}"
api_prefix_url = "FHIR/R4"


def generate_short_form_id(organisationCode):
    """Create R2 (short format) Prescription ID
    Build the prescription ID around the organisation code and add the required checkdigit.
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


def update_prescription(bundle_json, prescription_id, short_prescription_id, authored_on, signature_time):
    for entry in bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "Provenance":
            for signature in resource["signature"]:
                signature["when"] = signature_time
        if resource["resourceType"] == "MedicationRequest":
            resource["groupIdentifier"]["value"] = short_prescription_id
            for extension in resource["groupIdentifier"]["extension"]:
                if extension["url"] == "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionId":
                    extension["valueIdentifier"]["value"] = prescription_id
            resource["authoredOn"] = authored_on
            if "validityPeriod" in resource["dispenseRequest"]:
                resource["dispenseRequest"]["validityPeriod"]["start"] = date.today().isoformat()
                resource["dispenseRequest"]["validityPeriod"]["end"] = (date.today() + timedelta(weeks=4)).isoformat()


def find_prepare_request_paths(examples_root_dir):
    for filename in glob.iglob(f'{examples_root_dir}**/*Prepare-Request*200_OK*.json', recursive=True):
        yield filename


def load_prepare_request(prepare_request_path):
    return load_json(prepare_request_path)


def load_process_request(process_request_path):
    return load_json(process_request_path)


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_prepare_request(prepare_request_path, prepare_request_json):
    save_json(prepare_request_path, prepare_request_json)


def save_prepare_response(prepare_response_path, prepare_response_json):
    save_json(prepare_response_path, prepare_response_json)


def save_process_request(process_request_path, process_request_json):
    save_json(process_request_path, process_request_json)


def save_convert_response(convert_response_path, convert_response_xml):
    save_xml(convert_response_path, convert_response_xml)


def save_json(path, body):
    with open(path, 'w') as f:
        json.dump(body, f, indent=2)


def save_xml(path, body):
    with open(path, 'w') as f:
        f.write(body)


def get_organisation_code(prepare_request_json):
    for entry in prepare_request_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "HealthcareService":
            for identifier in resource["identifier"]:
                return identifier["value"]


def get_prepare_response_from_a_sandbox_api(api_base_url, prepare_request_json):
    return requests.post(
        f'{api_base_url}/{api_prefix_url}/$prepare',
        data=json.dumps(prepare_request_json),
        headers={'Content-Type': 'application/json', 'X-Request-ID': str(uuid.uuid4())}
    ).json()


def get_convert_response_from_a_sandbox_api(api_base_url, process_request_json):
    return requests.post(
        f'{api_base_url}/{api_prefix_url}/$convert',
        data=json.dumps(process_request_json),
        headers={'Content-Type': 'application/json', 'X-Request-ID': str(uuid.uuid4())}
    ).text


def get_signature_timestamp_from_prepare_response(prepare_response_json):
    for parameter in prepare_response_json["parameter"]:
        if parameter["name"] == "timestamp":
            return parameter["valueString"]


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


def update_prepare_examples(api_base_url, prepare_request_path, prepare_request_json, prescription_id, authored_on):
    organisation_code = get_organisation_code(prepare_request_json)
    short_prescription_id = generate_short_form_id(organisation_code)
    update_prescription(prepare_request_json, prescription_id, short_prescription_id, authored_on, None)
    save_prepare_request(prepare_request_path, prepare_request_json)
    prepare_response_json = get_prepare_response_from_a_sandbox_api(api_base_url, prepare_request_json)
    prepare_response_path = derive_prepare_response_path(prepare_request_path)
    save_prepare_response(prepare_response_path, prepare_response_json)
    signature_time = get_signature_timestamp_from_prepare_response(prepare_response_json)
    return short_prescription_id, signature_time


def update_process_examples(
    api_base_url, prepare_request_path, prescription_id, short_prescription_id, authored_on, signature_time
):
    process_request_path_pattern = derive_process_request_path_pattern(prepare_request_path)
    for process_request_path in glob.iglob(process_request_path_pattern):
        process_request_json = load_process_request(process_request_path)
        update_prescription(
            process_request_json, prescription_id, short_prescription_id, authored_on, signature_time
        )
        save_process_request(process_request_path, process_request_json)
        convert_response_xml = get_convert_response_from_a_sandbox_api(api_base_url, process_request_json)
        convert_response_path = derive_convert_response_path(process_request_path)
        save_convert_response(convert_response_path, convert_response_xml)


def update_examples(api_base_url):
    authored_on = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S+00:00')
    for prepare_request_path in find_prepare_request_paths(examples_root_dir):
        prescription_id = str(uuid.uuid4())
        prepare_request_json = load_prepare_request(prepare_request_path)
        short_prescription_id, signature_time = update_prepare_examples(
            api_base_url, prepare_request_path, prepare_request_json, prescription_id, authored_on
        )
        update_process_examples(
            api_base_url, prepare_request_path, prescription_id, short_prescription_id, authored_on,
            signature_time
        )


def main(arguments):
    update_examples(arguments["API_BASE_URL"])


if __name__ == "__main__":
    main(arguments=docopt(__doc__, version="0"))


# Tests
test_examples_root_dir = f".{os.path.sep}models{os.path.sep}examples{os.path.sep}"


@pytest.fixture
# ensure example is repeat-dispensing to cover validity_period test in addition to other test
def test_bundle_json():
    process_request_path_root = f'{test_examples_root_dir}{os.path.sep}**{os.path.sep}'
    process_request_sub_path = f'repeat-dispensing{os.path.sep}**{os.path.sep}'
    process_request_file = '1-Process-Request-Send-200_OK.json'
    process_request_path_pattern = f'{process_request_path_root}{process_request_sub_path}{process_request_file}'
    process_request_path = next(glob.iglob(process_request_path_pattern, recursive=True))
    with open(process_request_path) as f:
        process_request_json = json.load(f)
    return process_request_json


@pytest.fixture
def test_prepare_response_json():
    prepare_response_path_root = f'{test_examples_root_dir}{os.path.sep}**{os.path.sep}'
    prepare_response_file = '1-Prepare-Response-200_OK.json'
    prepare_response_path_pattern = f'{prepare_response_path_root}{prepare_response_file}'
    prepare_response_path = next(glob.iglob(prepare_response_path_pattern, recursive=True))
    with open(prepare_response_path) as f:
        prepare_response_json = json.load(f)
    return prepare_response_json


def test_generate_short_form_id__contains_org_code_in_middle():
    organisationCode = "testOrgCode"
    short_form_id = generate_short_form_id(organisationCode)
    short_form_id_split = short_form_id.split("-")
    assert len(short_form_id_split) == 3
    short_form_id_middle = short_form_id_split[1]
    assert short_form_id_middle == organisationCode


def test_find_prepare_request_paths__finds_prepare_examples():
    for prepareRequest in find_prepare_request_paths(test_examples_root_dir):
        break
    else:
        raise Exception('Failed to find any prepare examples')


def test_update_prescription__updates_prescription_id(test_bundle_json):
    prescription_id = "newValue"
    update_prescription(test_bundle_json, prescription_id, None, None, None)
    for entry in test_bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            for extension in resource["groupIdentifier"]["extension"]:
                if extension["url"] == "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionId":
                    prescription_id_updated = extension["valueIdentifier"]["value"]
    assert prescription_id == prescription_id_updated


def test_update_prescription__updates_short_prescription_id(test_bundle_json):
    short_prescription_id = "newValue"
    update_prescription(test_bundle_json, None, short_prescription_id, None, None)
    for entry in test_bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            short_prescription_id_updated = resource["groupIdentifier"]["value"]
    assert short_prescription_id == short_prescription_id_updated


def test_update_prescription__updates_signature_time(test_bundle_json):
    signature_time = "newValue"
    update_prescription(test_bundle_json, None, None, None, signature_time)
    for entry in test_bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "Provenance":
            for signature in resource["signature"]:
                signature_time_updated = signature["when"]
                break
    assert signature_time == signature_time_updated


def test_update_prescription__updates_authored_on(test_bundle_json):
    authored_on = "newValue"
    update_prescription(test_bundle_json, None, None, authored_on, None)
    for entry in test_bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            authored_on_updated = resource["authoredOn"]
    assert authored_on == authored_on_updated


def test_update_prescription__sets_validity_period_for_4_weeks_from_today(test_bundle_json):
    update_prescription(test_bundle_json, None, None, None, None)
    for entry in test_bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "MedicationRequest":
            if "validityPeriod" in resource["dispenseRequest"]:
                validityStart = resource["dispenseRequest"]["validityPeriod"]["start"]
                validityEnd = resource["dispenseRequest"]["validityPeriod"]["end"]
    assert validityStart == date.today().isoformat()
    assert validityEnd == (date.today() + timedelta(weeks=4)).isoformat()


def test_get_organisation_code__gets_org_code_from_bundle(test_bundle_json):
    organisationCode = get_organisation_code(test_bundle_json)
    for entry in test_bundle_json['entry']:
        resource = entry["resource"]
        if resource["resourceType"] == "HealthcareService":
            for identifier in resource["identifier"]:
                actualOrganisationCode = identifier["value"]
    assert organisationCode == actualOrganisationCode


def test_get_signature_timestamp_from_prepare_response(test_prepare_response_json):
    print(test_prepare_response_json)
    signature_time = "newValue"
    for parameter in test_prepare_response_json["parameter"]:
        if parameter["name"] == "timestamp":
            parameter["valueString"] = signature_time
    signature_time_updated = get_signature_timestamp_from_prepare_response(test_prepare_response_json)
    assert signature_time == signature_time_updated
