FROM node:10.5
WORKDIR /app
COPY . .
RUN npm install pm2 -g
RUN npm i
RUN npm run prod
CMD ["pm2-runtime", "build/oracle.js"]
