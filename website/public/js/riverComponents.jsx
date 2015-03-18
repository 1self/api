  /** @jsx React.DOM */
  var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

  var styleDisplayNone = {
    display: "None"
  }


  var NoDataMessage = React.createClass({
    render: function() {
      return (
        <div className="msg">
          <p>This is your data river.</p>
          <p>You don't have any data yet but soon your data will start flooding in. When it does your timeline will show you your streams of data as they arrive. You can use your river data as a jump off point for further exploration of your data. We'll also pop useful, interesting and fun insights as stuff happens in your data.</p>
          <p>There's always something new happening in your river so come back often :)</p>
        </div>
        )
    }
  });

  var River = React.createClass({
    getInitialState: function(){
      return {events: [], skip: 0, limit: 50, showMore: true};      
    },

    fetchEventData: function() {
      var url = this.props.source + "?skip=" + this.state.skip + "&limit=" + this.state.limit;
      var self = this;
      $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        beforeSend: function(xhr){
          xhr.setRequestHeader('Authorization', eun);
        },
        success: function(result) {
          if (self.isMounted()) {
            self.setState({
              skip: self.state.skip + 50,
              limit: 50,
              events: self.state.events.concat(result),
              showMore: result.length === 50
            });
          }
        },
        error: function() {
          console.error('Problem while fetching timeline events!');
        }
      });
    },

    componentDidMount: function() {
      this.fetchEventData();
    },

    render: function() {
      var riverEvents = constructRiverData(this.state.events);
      var dateGroups = riverEvents.map(function(dateGroup){
        return <DateGroup key={dateGroup.date} day={dateGroup.date} group={dateGroup.data} />;
      });

      return (
          <div>
          {this.state.events.length === 0 ? <NoDataMessage /> : ( 
            <div>
            {dateGroups}
            {this.state.showMore ? <MoreButton clickHandler={this.fetchEventData} /> : undefined}
            </div>
          )}
          </div>
        );
    }
  });

  var MoreButton = React.createClass({
    render: function(){
      return (
        <div className="more_events_button_wrapper">
          <button className="btn btn-default btn-lg rounded-button" onClick={this.props.clickHandler}>More</button>
        </div>
        );
    }
  });

  var DateGroup = React.createClass({
    render: function() {
      return ( 
        <div className = "accordion-parent" >
        <div className = "accordian-group-heading" >{this.props.day} </div> 
        <TagGroupList groups={this.props.group} />
        </div>
      );
    }
  });

  var TagGroupList = React.createClass({
    render: function() {
      var key = 0;
      var tagGroups = this.props.groups.map(function(group){
        return <TagGroup key={++key} icon={group.icon} title={group.title} from={group.from} to={group.to} chartUrl={group.chartUrl} events={group.events} />;
      });

      return (
        <div>
          {tagGroups}
        </div>
        );
    }
  });

  var TagGroup = React.createClass({
    render: function() {
      return (
        <div className="accordion-container">
          <TagGroupTitle icon={this.props.icon} title={this.props.title} from={this.props.from} to={this.props.to} count={this.props.events.length}/>
          <TagGroupContent chartUrl={this.props.chartUrl} events={this.props.events} />
        </div>
        );
    }
  });

  var TagGroupTitle = React.createClass({
    handleClick: function(event) {
      var node = $(this.getDOMNode());
      var wasVisible = $(node).next(".ui-accordion-content").is(':visible');
      $(".ui-accordion-content:visible").slideUp(500);

      if (wasVisible) {
        $(node).next(".ui-accordion-content").slideUp(500);
      } else {
        $(node).next(".ui-accordion-content").slideDown(500);
      }
    },

    render: function() {
      return (
        <div onClick={this.handleClick} className="accordian-title-container"><img className="accordian-title-logo float-left" src={this.props.icon} />
          <div className="accordian-heading float-left">
            <div className="width-100 center-aligned">
              <h3 className="accordian-title"> {this.props.title}</h3>
              <span>From {this.props.from} to {this.props.to}</span>
            </div>
          </div>
          <span className="counter bold">{this.props.count}</span>
        </div>
        );
    }
  });

  var TagGroupContent = React.createClass({
    getInitialState: function(){
      return {display: 'list'};
    },

    componentDidMount: function() {
      $($(this.getDOMNode())).find(".list-container-class").animate({
        width: "100%"
      }, 500);
    },

    handleClick: function(state) {
      var notSelected;
      if(state === 'list') {
        notSelected = 'graph';
      } else {
        notSelected = 'list';
      }
      this.setState({display: state, parent: this.getDOMNode() });
    },

    render: function() {
      return (
          <div className="ui-accordion-content">
            <div className="accordian-title-logo float-left height-ten-pixle"></div>
            <div className="accordian-heading float-left">
              <span className="list-graph-toggle-container">
              <a ref="list" href="#" onClick={this.handleClick.bind(this, 'list')} className="graph-toggle-link border-right list-link active-link">
                <img src="img/list-icon.png" className="graph-toggle-icon" />
              </a>
              <a ref="graph" href="#" onClick={this.handleClick.bind(this, 'graph')} className="graph-toggle-link graph-link">
                <img src="img/graph-icon.png" className="graph-toggle-icon" />
              </a>
              </span>
              
            </div>
            <ReactCSSTransitionGroup transitionName="fade">
              {this.state.display == 'graph' ? <EventsGraph parent={this.state.parent} chartUrl={this.props.chartUrl} /> : <EventsList parent={this.state.parent} events={this.props.events} />}
            </ReactCSSTransitionGroup>
          </div>
        );
    }
  });

  var EventsList = React.createClass({
    componentDidMount: function(){
      var parentNode = $(this.props.parent);

      $(parentNode).find('.list-link').addClass("active-link");
      $(parentNode).find('.graph-link').removeClass("active-link");
     
      $(parentNode).find(".graph-container-class").animate({
        width: "0px"
      }, 500);

      $(parentNode).find(".list-container-class").animate({
        width: "100%"
      }, 500);
    },

    render: function() {
      var key = 0;
      var events = this.props.events.map(function(event){
        return <Event key={++key} title={event.title} time={event.time} properties={event.properties} />;
      });

      return (
        <div className="clear-all list-container-class" id="list-container">
          {events}
        </div>
      );
    }
  });

  var Event = React.createClass({
    render: function(){
      return (
        <div className="details">
          <div className="clear-all">
            <h4 className="list-title">{this.props.title}</h4>
            <div className="time-stamp">{this.props.time}</div>
          </div>
          <PropertyList properties={this.props.properties} />
        </div>
        );
    }
  });

  var PropertyList = React.createClass({
    render: function() {
      var properties = this.props.properties.map(function(prop){
        return <Property key={prop.name} name={prop.name} value={prop.value} />;
      });

      return (
        <div className="clear-all">
          {properties} 
        </div>
        );
    }
  });

  var Property = React.createClass({
    render: function(){
      return (
        <div>
          <span>{this.props.name}:</span>
          <span> &ldquo;{this.props.value}&rdquo;</span>
        </div>
        );
    }
  });

  var EventsGraph = React.createClass({
    componentDidMount: function(){
      var parentNode = $(this.props.parent);
      var graphNode = $(this.refs['graph-container'].getDOMNode());

      $(parentNode).find(".list-container-class").animate({
        width: "0px"
      }, 500);

      if ($(window).width() <= 460) {
        $(graphNode).animate({
          width: "100%"
        }, 500);
      } else {
        $(graphNode).animate({
          width: "91%"
        }, 500);
        // $(".graph-container-class").show();
        $(graphNode).css({
          "float": "none"
        });
      }
      $(parentNode).find('.graph-link').addClass("active-link");
      $(parentNode).find('.list-link').removeClass("active-link");
    },

    render:function(){
      return (
            <div className="clear-all">
              <div className="accordian-title-logo float-left height-ten-pixle hide-on-mobile"></div>
              <div ref="graph-container" className="clear-all graph-container-class accordian-heading righ-aligned" id="graph-container" >
                
                <iframe src="" className="graph-iframe" src={this.props.chartUrl}></iframe>
              </div>
            </div>
        );
    }
  });

React.render(<River source={"/v1/users/" + username + "/events"} />, document.getElementById('river'));
