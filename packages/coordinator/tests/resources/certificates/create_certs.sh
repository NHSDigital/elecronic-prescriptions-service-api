#!/bin/bash

readonly BASE_DIR=$(pwd)
readonly CERTS_DIR="${BASE_DIR}/certs"
readonly KEYS_DIR="${BASE_DIR}/private"
readonly CRL_DIR="${BASE_DIR}/crl"
readonly CONFIG_DIR="${BASE_DIR}/config"

# OpenSSL Configs
readonly CA_CERT_SIGNING_CONFIG="openssl-ca.conf"
readonly SMARTCARD_CERT_SIGNING_CONFIG="openssl-smartcard.conf"

# CA config
readonly CA_NAME="ca"
readonly CA_CERT_DAYS="3650"
readonly CA_CERTIFICATE_SUBJECT="/C=GB/ST=Leeds/L=Leeds/O=nhs/OU=EPS Mock CA/CN=EPS Mock Root Authority"

# Smartcard config
readonly SMARTCARD_NAME="smartcard"
readonly SMARTCARD_CERT_SUBJECT_PREFIX="/C=GB/ST=Leeds/L=Leeds/O=nhs/OU=EPS Mock Cert/CN=Unit Tests - "
# v3 extensions
readonly V3_EXT="$BASE_DIR/v3.ext"

function get_timestamp {
    echo $(date +%Y%m%d_%H%M%S)
}

# Revokes a cert using the CRL Reason Code speicified
# 
# unspecified, keyCompromise, CACompromise, affiliationChanged, superseded,
# cessationOfOperation, certificateHold, removeFromCRL (only used with DeltaCRLs)
function revoke_cert {
    local readonly cert_name="$1"
    local readonly crl_reason="$2"

    echo "@ Revoking '$cert_name' with reason '$crl_reason'"
    openssl ca -config openssl-ca.conf -revoke "./certs/$cert_name.pem" -crl_reason "$crl_reason"
}

function generate_crl {
    openssl ca -config openssl-ca.conf -gencrl -out "$CRL_DIR/$CA_NAME.crl"
}

function convert_cert_to_der {
    local readonly cert_name="$1"
    echo "@ Converting $cert_name to DER format..."
    openssl x509 -outform DER -in "$CERTS_DIR/$cert_name.pem" -out "$CERTS_DIR/$cert_name.crt"
}

function generate_key {
    local readonly key_name="$1"
    echo "@ Generating key '$key_name'..."
    openssl genrsa -out "$KEYS_DIR/$key_name.pem" 4096
}

function generate_ca_cert {
    local readonly key_name="$1"
    echo "@ Generating CA certificate..."
    openssl req -new -x509 -days "$CA_CERT_DAYS" -config "$BASE_DIR/$CA_CERT_SIGNING_CONFIG" \
    -key "$KEYS_DIR/$key_name.pem" \
    -out "$CERTS_DIR/$key_name.pem" -outform PEM -subj "$CA_CERTIFICATE_SUBJECT"
}

function create_csr {
    local readonly key_name="$1"
    local readonly smartcard_description="$2"

    echo "@ Creating CRS for '$key_name'..."
    openssl req -config "$BASE_DIR/$SMARTCARD_CERT_SIGNING_CONFIG" -new \
    -key "$KEYS_DIR/$key_name.pem" \
    -out "$CERTS_DIR/$key_name.csr" -outform PEM \
    -subj "${SMARTCARD_CERT_SUBJECT_PREFIX}${smartcard_description}"
}

function sign_csr_with_ca {
    local readonly key_name="$1"
    echo "@ Using CSR to generate signed cert for '$key_name'..."
    openssl ca -batch \
    -config "$BASE_DIR/$CA_CERT_SIGNING_CONFIG" -policy signing_policy -extensions signing_req \
    -keyfile "$KEYS_DIR/$CA_NAME.pem" -cert "$CERTS_DIR/$CA_NAME.pem" \
    -out "$CERTS_DIR/$key_name.pem" -in "$CERTS_DIR/$key_name.csr"
}

function generate_ca_signed_cert {
    local readonly key_name="$1"
    local readonly cert_subject="$2"

    create_csr "$key_name" "$cert_subject"
    sign_csr_with_ca "$key_name"
}

function generate_valid_smartcard {
    local readonly timestamp=$(get_timestamp)
    local readonly name="$1_${timestamp}"

    local readonly description="Valid for Signing"
    generate_key "$name"
    generate_ca_signed_cert "$name" "$description"
    convert_cert_to_der "$name"
}

function generate_revoked_smartcard {
    local readonly timestamp=$(get_timestamp)
    local readonly crl_reason="$1"
    local readonly name="${crl_reason}_${timestamp}"

    generate_key "$name"

    local readonly description="Revoked because $crl_reason"
    generate_ca_signed_cert "$name" "$description"

    convert_cert_to_der "$name"
    revoke_cert "$name" "$crl_reason"
}

# Recreate output dirs
rm -rf "$CERTS_DIR" "$KEYS_DIR" "$CRL_DIR" "$CONFIG_DIR"
mkdir "$CERTS_DIR" "$KEYS_DIR" "$CRL_DIR" "$CONFIG_DIR"

# Create database and serial files
touch "$CONFIG_DIR/index.txt"
echo '1000' > "$CONFIG_DIR/crlnumber.txt"
echo '01' > "$CONFIG_DIR/serial.txt"

# Generate CA key and self-signed cert
echo "@ Generating CA credentials..."
generate_key "$CA_NAME"
generate_ca_cert "$CA_NAME"

# Generate smartcards key and CA signed certs
generate_valid_smartcard "valid"
generate_revoked_smartcard "keyCompromise"
generate_revoked_smartcard "cACompromise"

# Generate CRL with the revoked certs
generate_crl
