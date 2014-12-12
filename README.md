api
===

server side api that receives messages and serves data to the website

Development Enviorment set up For API 
  - Install heroku 
    For ubuntu  <br>
	  wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sh <br>
	  heroku plugins:install git://github.com/ddollar/heroku-config.git <br>
	  heroku git:remote -a quantifieddev  <br>
    heroku config:pull --overwrite --interactive <br>
	  For windows  <br>
    https://toolbelt.heroku.com/windows <br>	
  - Install supervisor <br>
	  For ubuntu <br>
		sudo npm install -g supervisor <br>
	  For windows	 <br>
		npm install -g supervisor	  <br> 
  - Install foreman <br>
 	 For ubuntu <br> 
	  sudo npm install -g supervisor <br>
	 For Windows <br>
	  foreman comes with heroku, try to execute foreman command if it is working then you are done. If this is not working then do gem install foreman -v 0.61. ( For this you must have ruby installed and added to your path variable) <br>
 - To run API  <br>
	 -mongodb must be started <br>
	 -start foreman using command foreman start -f Procfile.dev <br>
	 -If this does not work then use command "supervisor main.js" and for this you need to add all variables from .env to your add sysytem varibles. <br>
