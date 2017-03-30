FROM hypriot/rpi-node

VOLUME [ "/data/conf" ]

ADD package.json README.md LICENSE /data/
ADD src /data/src/

WORKDIR /data

RUN npm install

CMD ["npm", "start"]

