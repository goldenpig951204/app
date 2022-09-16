FROM node:16.6.0
RUN ["mkdir", "/home/application"]
COPY . /home/application/
WORKDIR /home/application
RUN npm install --production
CMD ["npm", "start"]
