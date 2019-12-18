import React, {useState, useEffect } from 'react';
import {isMobile} from 'react-device-detect';
import History from './History';
import SearchBar from './SearchBar';
import Map from './Map';
import MobileList from './MobileList';
import './App.scss';
import gMark from './img/w-marker-icon-2x.png';

import ReactGA from 'react-ga';
ReactGA.initialize('UA-149839620-1');
ReactGA.pageview(window.location.pathname + window.location.search);

const queryString = require('query-string');

/*
 * Overview of the entire app
 *
 * Global state is maintained in this file, App.js.  Other components
 * can update that state (via functions passed to those components), but 
 * for the most part, the other components are just expected to do what
 * they do and report back.  An example is the way the SearchBar works.
 * It gathers user input and then sets global state (such as the current
 * zip code) using routines passed in by App.js - in this case, setCurrZip().
 * The actual persistent global state is maintained in App.js.
 *
 * App.js does the API call to Mobilize to get events that match the current
 * search criteria - at the time of this writing (Dec. 2019), the criteria are 
 * zip code and distance away from that zip code in miles.
 *
 * Client side filtering of that list of events is also done in this 
 * code (App.js), such as filtering for a particular kind of event (like
 * canvassing or phone-banking).  The rest of the code is fed the filtered
 * list of events to display to the user.
 * 
 */

function App() {

  //List of events returned from the Mobilize API
  const [events, setEvents] = useState(null);

  // List of events after client-side filtering of the list of events returned from the Mobilize API
  const [filteredEvents, setFilteredEvents] = useState(null);  

  // Current range - distance in miles from the target zip code
  const [currRange, setCurrRange] = useState(75);

  // Current kinds of events to display
  const [currEventKind, setCurrEventKind] = useState('ALLEVENTS');


  //Current zip code search
  const [currZip, setCurrZip] = useState(() => {
    // check URL parameter on initialization
    const qs = queryString.parse(History.location.search);
    return qs.zip;
  });

  //Current event being hovered over (in the event list)
  const [hoverEvent, setHoverEvent] = useState(null);

  //Current selected location location filter
  //  When set, only events at the single location will be shown
  //  Set by a user clicking on a marker in the map, unset by a user clicking elsewhere on the map
  const [locFilt, setLocFilt] = useState(null);

  //For mobile, the current card
  const [cardIndex, setCardIndex] = useState(null);

  //Makes API call when zipcode entered or the range is updated
  useEffect(() => {
    if(currZip != null){
      fetch("https://api.mobilize.us/v1/organizations/1316/events?timeslot_start=gte_now&per_page=200&zipcode=" + currZip + "&max_dist=" + currRange)
      .then((res)=>res.json())
      .then((data)=>setEvents(data['data']));

      //Reset states on new zipcode
      setHoverEvent(null);
      setLocFilt(null);
      setCardIndex(0);

      //Tracks zip input

      ReactGA.event({
        category: 'Search',
        action: 'User Searched',
        label: `${currZip}`
      });

    }
  }, [currZip, currRange]);

  // Filters the events when there are new events from the API or when user changes filtering criteria
  useEffect(() => {
     if (!events){
         return setFilteredEvents(null);
     }

     setFilteredEvents(events.filter((event) => {
         return ((currEventKind === 'ALLEVENTS') || (currEventKind === event['event_type']));
     }));
   }, [events, currEventKind]);
   

  //Card index utilizes the hoverEvent to highlight the card's respective marker
  useEffect(() => {
    if(isMobile && filteredEvents != null){
      setHoverEvent((('location' in filteredEvents[cardIndex] && 'location' in filteredEvents[cardIndex]['location'] && 'latitude' in filteredEvents[cardIndex]['location']['location']) ? "" + filteredEvents[cardIndex]['location']['location']['latitude'] + "&" + filteredEvents[cardIndex]['location']['location']['longitude'] : null));
    }
  }, [cardIndex]);

  // Note that the code passes {filteredEvents} to other components rather than {events}.
  //      This shields the rest of the code from having to know and worry about client-side filtering - that
  //      code just operates on the list of events passed to it.

  return (
    <div className="app">
      <SearchBar currZip={currZip} currRange={currRange} currEventKind={currEventKind} updateZip={(newZip) => setCurrZip(newZip)} updateRange={(newRange) => setCurrRange(newRange)} updateEventKind={(newEventKind) => setCurrEventKind(newEventKind)} events={filteredEvents} updatedHover={(newHover) => setHoverEvent(newHover)} locFilt={locFilt}/>
      {events === null && currZip == null &&
        <div id="startLoad">
          <h1 id="firstLine">SHE HAS</h1><h1 id="secondLine">EVENTS</h1><h1 id="thirdLine">FOR THAT <img src={gMark} alt=""></img></h1>
          <h3 id="searchCTA">Enter your zipcode to find events near you!</h3>
        </div>
      }
      {filteredEvents !== null && isMobile &&
        <MobileList events={filteredEvents} updatedHover={(newHover) => setHoverEvent(newHover)} locFilt={locFilt} cardIndex={cardIndex} updateCardIndex={(update) => setCardIndex(update)}/>
      }
      <Map currZip={currZip} events={filteredEvents} hoverMarker={hoverEvent} selectLoc={(newLoc) => setLocFilt(newLoc)} locFilt={locFilt}/>
    </div>
  );
}

export default App;
