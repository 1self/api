FROM phusion/passenger-nodejs
ADD . /app
WORKDIR /app
RUN gem install foreman
RUN npm install
RUN npm install -g supervisor
CMD foreman start -f Procfile.dev
