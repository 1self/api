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

  var River = React.createClass({displayName: "River",
    render: function() {
      var dateGroups = this.props.events.map(function(dateGroup){
        return React.createElement(DateGroup, {key: dateGroup.date, day: dateGroup.date, group: dateGroup.data});
      });
      return ( 
        React.createElement("div", null, 
          dateGroups
        )
      );
    }
  });

  var DateGroup = React.createClass({displayName: "DateGroup",
    render: function() {
      return ( 
        React.createElement("div", {className: "accordion-parent"}, 
        React.createElement("div", {className: "accordian-group-heading"}, this.props.day, " "), 
        React.createElement(TagGroupList, {groups: this.props.group})
        )
      );
    }
  });

  var TagGroupList = React.createClass({displayName: "TagGroupList",
    render: function() {
      var key = 0;
      var tagGroups = this.props.groups.map(function(group){
        return React.createElement(TagGroup, {key: ++key, icon: group.icon, title: group.title, from: group.from, to: group.to, chartUrl: group.chartUrl, events: group.events});
      });

      return (
        React.createElement("div", null, 
          tagGroups
        )
        );
    }
  });

  var TagGroup = React.createClass({displayName: "TagGroup",
    render: function() {
      return (
        React.createElement("div", {className: "accordion-container"}, 
          React.createElement(TagGroupTitle, {icon: this.props.icon, title: this.props.title, from: this.props.from, to: this.props.to, count: this.props.events.length}), 
          React.createElement(TagGroupContent, {chartUrl: this.props.chartUrl, events: this.props.events})
        )
        );
    }
  });

  var TagGroupTitle = React.createClass({displayName: "TagGroupTitle",
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
        React.createElement("div", {onClick: this.handleClick, className: "accordian-title-container"}, React.createElement("img", {className: "accordian-title-logo float-left", src: this.props.icon}), 
          React.createElement("div", {className: "accordian-heading float-left"}, 
            React.createElement("div", {className: "width-100 center-aligned"}, 
              React.createElement("h3", null, " ", this.props.title), 
              React.createElement("span", null, "From ", this.props.from, " to ", this.props.to)
            )
          ), 
          React.createElement("span", {className: "counter bold"}, this.props.count)
        )
        );
    }
  });

  var TagGroupContent = React.createClass({displayName: "TagGroupContent",
    getInitialState: function(){
      return {display: 'list'};
    },
    handleClick: function(state) {    
      this.setState({display: state});
    },
    render: function() {

      return (
          React.createElement("div", {className: "ui-accordion-content"}, 
            React.createElement("div", {className: "accordian-title-logo float-left height-ten-pixle"}), 
            React.createElement("div", {className: "accordian-heading float-left"}, 
              React.createElement("span", {className: "list-graph-toggle-container"}, 
              React.createElement("a", {href: "#", onClick: this.handleClick.bind(this, 'list'), className: "graph-toggle-link border-right list-link active-link"}, 
                React.createElement("img", {src: "img/list-icon.png", className: "graph-toggle-icon"})
              ), 
              React.createElement("a", {href: "#", onClick: this.handleClick.bind(this, 'graph'), className: "graph-toggle-link graph-link"}, 
                React.createElement("img", {src: "img/graph-icon.png", className: "graph-toggle-icon"})
              )
              )
              
            ), 
            React.createElement(ReactCSSTransitionGroup, {transitionName: "fade"}, 
              this.state.display == 'graph' ? React.createElement(EventsGraph, {chartUrl: this.props.chartUrl}) : React.createElement(EventsList, {events: this.props.events})
            )
          )
        );
    }
  });

  var EventsList = React.createClass({displayName: "EventsList",
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
        return React.createElement(Event, {key: ++key, title: event.title, time: event.time, properties: event.properties});
      });

      return (
        React.createElement("div", {className: "clear-all list-container-class", id: "list-container"}, 
          events
        )
      );
    }
  });

  var Event = React.createClass({displayName: "Event",
    render: function(){
      return (
        React.createElement("div", {className: "details"}, 
          React.createElement("div", {className: "clear-all"}, 
            React.createElement("h4", {className: "list-title"}, this.props.title), 
            React.createElement("div", {className: "time-stamp"}, this.props.time)
          ), 
          React.createElement(PropertyList, {properties: this.props.properties})
        )
        );
    }
  });

  var PropertyList = React.createClass({displayName: "PropertyList",
    render: function() {
      var properties = this.props.properties.map(function(prop){
        return React.createElement(Property, {key: prop.name, name: prop.name, value: prop.value});
      });

      return (
        React.createElement("div", {className: "clear-all"}, 
          properties
        )
        );
    }
  });

  var Property = React.createClass({displayName: "Property",
    render: function(){
      return (
        React.createElement("div", null, 
          React.createElement("span", null, this.props.name, " :"), 
          React.createElement("span", null, "“", this.props.value, "”")
        )
        );
    }
  });

  var EventsGraph = React.createClass({displayName: "EventsGraph",
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
            React.createElement("div", {className: "clear-all"}, 
              React.createElement("div", {className: "accordian-title-logo float-left height-ten-pixle hide-on-mobile"}), 
              React.createElement("div", {className: "clear-all graph-container-class accordian-heading righ-aligned", id: "graph-container"}, 
                
                React.createElement("iframe", {src: "", className: "graph-iframe", src: this.props.chartUrl}
                )
              )
            )
        );
    }
  });

//React.render(<River events={riverData} />, document.getElementById('river'));

var renderTimeline = function(events){
  React.render(React.createElement(River, {events: riverData}), document.getElementById('river'));
};