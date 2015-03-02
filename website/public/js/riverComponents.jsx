  /** @jsx React.DOM */
  var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

  var styleDisplayNone = {
    display: "None"
  }

  var River = React.createClass({
    getInitialState: function(){
      return {events: [], skip: 0, limit: 50};      
    },

    fetchEventData: function() {
      var url = this.props.source + "?skip=" + this.state.skip + "&limit=" + this.state.limit;
      var skipped = this.state.skip + 50;
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
              skip: skipped,
              limit: 50,
              events: self.state.events.concat(constructRiverData(result))
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
      var dateGroups = this.state.events.map(function(dateGroup){
        return <DateGroup key={dateGroup.date} day={dateGroup.date} group={dateGroup.data} />;
      });
      return ( 
        <div>
          {dateGroups}
          <MoreButton clickHandler={this.fetchEventData} />
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

    handleClick: function(state) {
      var notSelected;
      if(state === 'list') {
        notSelected = 'graph';
      } else {
        notSelected = 'list';
      }
      this.setState({display: state, select: this.refs[state].getDOMNode(), unselect: this.refs[notSelected].getDOMNode()});
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
              {this.state.display == 'graph' ? <EventsGraph select={this.state.select} unselect={this.state.unselect} chartUrl={this.props.chartUrl} /> : <EventsList select={this.state.select} unselect={this.state.unselect} events={this.props.events} />}
            </ReactCSSTransitionGroup>
          </div>
        );
    }
  });

  var EventsList = React.createClass({
    componentDidMount: function(){
            $($(this.props.select)).addClass("active-link");
            $($(this.props.unselect)).removeClass("active-link");
     
      $(".graph-container-class").animate({
        width: "0px"
      }, 500);
      $(".list-container-class").animate({
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
      if ($(window).width() <= 460) {
        $(".graph-container-class").animate({
          width: "100%"
        }, 500);
      } else {
        $(".graph-container-class").animate({
          width: "91%"
        }, 500);
        // $(".graph-container-class").show();
        $(".graph-container-class").css({
          "float": "none"
        });
      }
      $($(this.props.select)).addClass("active-link");
      $($(this.props.unselect)).removeClass("active-link");
    },

    render:function(){
      return (
            <div className="clear-all">
              <div className="accordian-title-logo float-left height-ten-pixle hide-on-mobile"></div>
              <div className="clear-all graph-container-class accordian-heading righ-aligned" id="graph-container" >
                
                <iframe src="" className="graph-iframe" src={this.props.chartUrl}>
                </iframe>
              </div>
            </div>
        );
    }
  });

React.render(<River source={"/v1/users/" + username + "/events"} />, document.getElementById('river'));
