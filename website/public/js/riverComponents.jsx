      /** @jsx React.DOM */
      var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

      var styleDisplayNone = {
        display: "None"
      }

      var riverData = [
    {date: "Today", data: [
      {title: "Browse", from: "9:00", to: "10:00", icon: "img/visit-counter-icon.png" ,chartUrl: "https://api.1self.co/v1/streams/ZLXETTQVBIZGMUMY/events/self/code/sum(duration)/daily/barchart?readToken=e573d3091aeece819e6e0d8904fbbcc5b257591b4d8a", events: [
        {title: "Music Listen", time: "09:10", properties: [
          {name: "Track Name", value: "Get Up Stand Up"},
          {name: "Artist", value: "Bob Marley"}
        ]},
        {title: "Music Listen", time: "19:12", properties: [
          {name: "Track Name", value: "Creep"},
          {name: "Artist", value: "Radiohead"}
        ]}
      ]},
      {title: "Browse", from: "9:00", to: "10:00", icon: "img/lastfm.png", chartUrl: "https://api.1self.co/v1/streams/ZLXETTQVBIZGMUMY/events/self/code/sum(duration)/daily/barchart?readToken=e573d3091aeece819e6e0d8904fbbcc5b257591b4d8a", events: [
        {title: "Music Listen", time: "09:10", properties: [
          {name: "Track Name", value: "Paranoid Android"},
          {name: "Artist", value: "Radiohead"}
        ]},
        {title: "Music Listen", time: "19:12", properties: [
          {name: "Track Name", value: "Belief"},
          {name: "Artist", value: "John Mayer"}
        ]}
      ]}
    ]},
    {date: "Yesterday", data: [
      {title: "Browse", from: "9:00", to: "10:00", icon: "img/visit-counter-icon.png", chartUrl: "https://api.1self.co/v1/streams/ZLXETTQVBIZGMUMY/events/self/code/sum(duration)/daily/barchart?readToken=e573d3091aeece819e6e0d8904fbbcc5b257591b4d8a", events: [
        {title: "Music Listen", time: "09:10", properties: [
          {name: "Track Name", value: "Stir It Up"},
          {name: "Artist", value: "Bob Marley"}
        ]},
        {title: "Music Listen", time: "19:12", properties: [
          {name: "Track Name", value: "I Miss You"},
          {name: "Artist", value: "Icubus"}
        ]}
      ]},
      {title: "Browse", from: "9:00", to: "10:00", icon: "img/lastfm.png", chartUrl: "", events: [
        {title: "Music Listen", time: "09:10", properties: [
          {name: "Track Name", value: "Adam's Song"},
          {name: "Artist", value: "Blink-182"}
        ]},
        {title: "Music Listen", time: "19:12", properties: [
          {name: "Track Name", value: "Uprising"},
          {name: "Artist", value: "Muse"}
        ]}
      ]}
    ]}
  ];

  var River = React.createClass({
    render: function() {
      var dateGroups = this.props.events.map(function(dateGroup){
        return <DateGroup key={dateGroup.date} day={dateGroup.date} group={dateGroup.data} />;
      });
      return ( 
        <div>
          {dateGroups}
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
      console.log("Clicked!");
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
              <h3> {this.props.title}</h3>
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
      this.setState({display: state});
    },
    render: function() {

      return (
          <div className="ui-accordion-content">
            <div className="accordian-title-logo float-left height-ten-pixle"></div>
            <div className="accordian-heading float-left">
              <span className="list-graph-toggle-container">
              <a href="#" onClick={this.handleClick.bind(this, 'list')} className="graph-toggle-link border-right list-link active-link">
                <img src="img/list-icon.png" className="graph-toggle-icon" />
              </a>
              <a href="#" onClick={this.handleClick.bind(this, 'graph')} className="graph-toggle-link graph-link">
                <img src="img/graph-icon.png" className="graph-toggle-icon" />
              </a>
              </span>
              
            </div>
            <ReactCSSTransitionGroup transitionName="fade">
              {this.state.display == 'graph' ? <EventsGraph chartUrl={this.props.chartUrl} /> : <EventsList events={this.props.events} />}
            </ReactCSSTransitionGroup>
          </div>
        );
    }
  });

  var EventsList = React.createClass({
    componentDidMount: function(){
            $(".list-link").addClass("active-link");
            $(".graph-link").removeClass("active-link");
     
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
          <span>{this.props.name} :</span>
          <span>&ldquo;{this.props.value}&rdquo;</span>
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
            $(".graph-link").addClass("active-link");
            $(".list-link").removeClass("active-link");
     
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

//React.render(<River events={riverData} />, document.getElementById('river'));

var renderTimeline = function(events){
  React.render(<River events={events} />, document.getElementById('river'));
};