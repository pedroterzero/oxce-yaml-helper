FROM node:14-buster-slim

RUN apt update
RUN apt install -y libx11-xcb-dev libglib2.0-0 libxcb-dri3-0 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxi6 libxtst6 libnss3 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtk-3-0 \
    libdrm2 libgbm1 libxss1 libasound2 libxkbfile1 libcanberra-gtk3-module libxshmfence1 git