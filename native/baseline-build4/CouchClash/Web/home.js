'use strict';
function scheduleState(){document.getElementById('schedule-state').textContent=Date.now()>=Date.parse('2026-10-06T00:15:00Z')?'STATUS UNVERIFIED':'SCHEDULED';}
scheduleState();document.addEventListener('visibilitychange',scheduleState);

