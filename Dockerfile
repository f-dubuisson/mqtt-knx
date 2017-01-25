FROM resin/rpi-raspbian:jessie

RUN  apt-get update \
   && apt-get -y install npm

VOLUME conf

COPY mqtt-knx.js package.json README.md LICENSE /

RUN npm install

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["./mqtt-knx.js"]

