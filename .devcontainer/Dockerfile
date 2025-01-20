# syntax=docker/dockerfile:1.4
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# this should be regularly updated to the latest version from https://github.com/NHSDigital/validation-service-fhir-r4/releases
ARG VALIDATOR_VERSION_TAG=v1.0.222-alpha

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y dist-upgrade \
    && apt-get -y install --no-install-recommends htop vim curl git build-essential \
    libffi-dev libssl-dev libxml2-dev libxslt1-dev libjpeg8-dev libbz2-dev \
    zlib1g-dev unixodbc unixodbc-dev libsecret-1-0 libsecret-1-dev libsqlite3-dev \
    openjdk-8-jdk jq apt-transport-https ca-certificates gnupg-agent \
    software-properties-common bash-completion python3-pip make libbz2-dev \
    libreadline-dev libsqlite3-dev wget llvm libncurses5-dev libncursesw5-dev \
    xz-utils tk-dev liblzma-dev netcat awscli default-jre maven

# install aws stuff
RUN wget -O /tmp/awscliv2.zip "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" && \
    unzip /tmp/awscliv2.zip -d /tmp/aws-cli && \
    /tmp/aws-cli/aws/install && \
    rm tmp/awscliv2.zip && \
    rm -rf /tmp/aws-cli

RUN wget -O /tmp/aws-sam-cli.zip https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip && \
    unzip /tmp/aws-sam-cli.zip -d /tmp/aws-sam-cli && \
    /tmp/aws-sam-cli/install && \
    rm /tmp/aws-sam-cli.zip && \
    rm -rf /tmp/aws-sam-cli

# install non snap version of firefox
RUN add-apt-repository -y ppa:mozillateam/ppa
COPY <<EOF /etc/apt/preferences.d/mozilla-firefox 
Package: *
Pin: release o=LP-PPA-mozillateam
Pin-Priority: 1001 
EOF

RUN apt-get -y install firefox
USER vscode

# Install ASDF
RUN git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.11.2; \
    echo '. $HOME/.asdf/asdf.sh' >> ~/.bashrc; \
    echo '. $HOME/.asdf/completions/asdf.bash' >> ~/.bashrc;

ENV PATH="$PATH:/home/vscode/.asdf/bin/"

# Install ASDF plugins
RUN asdf plugin add python; \
    asdf plugin add poetry https://github.com/asdf-community/asdf-poetry.git; \
    asdf plugin add shellcheck https://github.com/luizm/asdf-shellcheck.git; \
    asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git; \
    asdf plugin add java; \
    asdf plugin add actionlint;

WORKDIR /workspaces/electronic-prescription-service-api
ADD .tool-versions /workspaces/electronic-prescription-service-api/.tool-versions

RUN asdf install; \
    asdf reshim python; \
    asdf reshim poetry; \
    asdf reshim nodejs; \
    asdf reshim java;

RUN echo 'source /workspaces/electronic-prescription-service-api/.envrc' >> ~/.bashrc

# download validator
RUN git clone --depth 1 --branch $VALIDATOR_VERSION_TAG https://github.com/NHSDigital/validation-service-fhir-r4.git /workspaces/validator
ADD .tool-versions /workspaces/validator/.tool-versions
