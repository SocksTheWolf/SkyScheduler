const calendarDateFormatter = new Intl.DateTimeFormat("en-US",
  {hour: 'numeric', minute: '2-digit'});
const calendarSchedule = EventCalendar.create(document.getElementById("calendarView"), {
  view: 'dayGridMonth',
  editable: false,
  headerToolbar: {start: 'title', center: 'timeGridDay,dayGridMonth,listWeek', end: 'prev,next'},
  allDaySlot: false,
  eventStartEditable: false,
  flexibleSlotTimeLimits: true,
  buttonText: text => ({...text, listWeek: 'week list'}),
  eventTimeFormat: function(start, _end) {
    return calendarDateFormatter.format(start);
  },
  /* N^3 nightmare ugh, but it's better than DOM flushing huge amounts of trash elements */
  eventSources: [{events: function() {
    let events = [];
    const getAllPosts = document.querySelectorAll("#posts > article[id^=\"post-\"]");
    if (getAllPosts !== null) {
      getAllPosts.forEach((baseEl) => {
        const postTimes = []; // used for deduping posts of a post
        const postID = baseEl.firstChild.getAttribute("data-item");
        const postContent = baseEl.querySelector(".postText").textContent;
        const baseTimeEl = baseEl.querySelector(".contentPostDate");
        if (baseTimeEl === null || !baseTimeEl.hasAttribute("data-convertedtime")) {
          return;
        }
        // Handle the initial schedule
        const baseTime = baseTimeEl.getAttribute("data-convertedtime");
        let baseTimeEnd = new Date(baseTime);
        baseTimeEnd.setHours(baseTimeEnd.getHours() + 3);
        const eventColor = getRandomHSLColor();
        events.push({
          id: postID,
          title: postContent,
          start: baseTime,
          backgroundColor: eventColor,
          end: baseTimeEnd,
          resourceId: postID
        });
        postTimes.push(baseTimeEl.getAttribute("data-originaltime"));

        // Handle reposts
        const repostTimeSegments = baseEl.querySelectorAll(".repostInfoData .timestamp");
        if (repostTimeSegments !== null) {
          repostTimeSegments.forEach((repostTimeEl) => {
            // Get information about this repost rule
            const repostStartTime = new Date(repostTimeEl.getAttribute("data-convertedtime"));
            const repostHourAmt = Number(repostTimeEl.getAttribute("data-repost-cadance"));
            const repostCount = Number(repostTimeEl.getAttribute("data-repost-amount"));
            // Add events for each rule
            for (let i = 0; i <= repostCount; ++i) {
              let repostStart = new Date(repostStartTime.getTime());
              const newHours = repostStart.getHours() + (repostHourAmt * i);
              const newMinutes = (newHours % 1) * 60;
              // setHours/setMinutes take integers, so we need to make sure that we
              // properly smash the number remainders
              repostStart.setHours(newHours);
              repostStart.setMinutes(repostStart.getMinutes() + newMinutes);
              const repostUTCTime = repostStart.toISOString();
              // check if we already have a time event similar in another rule
              if (postTimes.includes(repostUTCTime)) {
                // and skip if we do (dedupe)
                continue;
              }
              // otherwise push this repost event
              let repostTimeEnd = new Date(repostStart.getTime());
              repostTimeEnd.setHours(repostStart.getHours() + 3);
              events.push({
                title: postContent,
                start: repostStart,
                end: repostTimeEnd,
                backgroundColor: eventColor,
                resourceId: postID,
                classNames: ["repostEvent"]
              });
              // add to dedupe tracker
              postTimes.push(repostUTCTime);
            }
          });
        }
      });
    }
    return events;
  }}],
});

document.addEventListener("DOMContentLoaded", () => {
  const calendarModal = document.getElementById("calendarDialog");
  addClickKeyboardListener(document.getElementById("openCalendarButton"), () => {
    calendarSchedule.refetchEvents();
    openModal(calendarModal);
  });
  document.querySelectorAll(".closeCalendarButton").forEach((closeEl) => {
    addClickKeyboardListener(closeEl, () => {
      closeModal(calendarModal);
    });
  });
});