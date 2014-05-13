#git clone git@github.com:QuantifiedDev/api.git
#git clone git@github.com:QuantifiedDev/website.git
wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sh
sudo npm install -g supervisor
heroku plugins:install git://github.com/ddollar/heroku-config.git
heroku git:remote -a quantifieddev
heroku config:pull --overwrite --interactive