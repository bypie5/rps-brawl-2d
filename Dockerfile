FROM node:19-alpine3.16 AS build

COPY package.json package-lock.json ./

COPY /src ./src

RUN ls -la

# Install build dependencies
RUN npm ci

FROM build AS development

COPY /test ./test

# install npm
RUN npm install -g npm

# run bash
CMD [ "sh" ]

EXPOSE 8080
EXPOSE 8081

FROM build AS production

CMD [ "npm", "start" ]

EXPOSE 8080
EXPOSE 8081
