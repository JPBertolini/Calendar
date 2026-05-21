const { 
  HDate, 
  HebrewCalendar, 
  calculateMolad, 
  getMoladAsDate, 
  gematriya, 
  Location
} = window.hebcal;

// --- APPLICATION STATE ---
let currentHebrewYear = 5786;
let currentHebrewMonth = 3; // Sivan (starts around mid-May 2026)
let selectedDate = new HDate(); // Default to today

// Cache DOM elements
const selectMonth = document.getElementById('select-month');
const selectYear = document.getElementById('select-year');
const btnFilter = document.getElementById('btn-filter');
const filterPanel = document.getElementById('filter-panel');

const titleHebrew = document.getElementById('title-hebrew');
const subtitleGregorian = document.getElementById('subtitle-gregorian');
const calendarGrid = document.getElementById('calendar-grid');

const dayViewTitleHebrew = document.getElementById('day-view-title-hebrew');
const dayViewTitleGregorian = document.getElementById('day-view-title-gregorian');
const dayViewMoonIcon = document.getElementById('day-view-moon-icon');
const dayViewMoonText = document.getElementById('day-view-moon-text');
const dayViewZodiacIcon = document.getElementById('day-view-zodiac-icon');
const dayViewZodiacText = document.getElementById('day-view-zodiac-text');

const timelineNightStatus = document.getElementById('timeline-night-status');
const timelineNightEvents = document.getElementById('timeline-night-events');
const timelineDayStatus = document.getElementById('timeline-day-status');
const timelineDayEvents = document.getElementById('timeline-day-events');

const labelSunsetPrev = document.getElementById('label-sunset-prev');
const labelSunriseToday = document.getElementById('label-sunrise-today');

const dayEclipseWarning = document.getElementById('day-eclipse-warning');
const dayEclipseText = document.getElementById('day-eclipse-text');
const dayPlanetsList = document.getElementById('day-planets-list');

// --- TRANSLATION TABLES & DATA MAPS ---
const HEBREW_MONTH_NAMES = {
  1: { en: 'Nisan', he: 'נִיסָן' },
  2: { en: 'Iyyar', he: 'אִיָּיר' },
  3: { en: 'Sivan', he: 'סִיוָן' },
  4: { en: 'Tamuz', he: 'תַּמּוּז' },
  5: { en: 'Av', he: 'אָב' },
  6: { en: 'Elul', he: 'אֱלוּל' },
  7: { en: 'Tishrei', he: 'תִּשְׁרֵי' },
  8: { en: 'Cheshvan', he: 'מַרְחֶשְׁוָן' },
  9: { en: 'Kislev', he: 'כִּסְלֵו' },
  10: { en: 'Tevet', he: 'טֵבֵת' },
  11: { en: 'Sh\'vat', he: 'שְׁבָט' },
  12: { en: 'Adar', he: 'אֲדָר' },
  13: { en: 'Adar II', he: 'אֲדָר ב׳' } // Adar II in leap years. Adar I will be mapped to 12.
};

// Real-world astronomical eclipse lookups (Hebrew Years 5785 - 5788)
// We define the duration (start and end Hebrew dates) so that the eclipse badge
// appears for all days of the eclipse's span.
const ECLIPSE_LIST = [
  {
    start: { d: 30, m: 11, y: 5786 },
    end: { d: 30, m: 11, y: 5786 },
    type: 'Solar',
    desc: 'Annular Solar Eclipse visible in parts of the southern hemisphere.'
  },
  {
    start: { d: 15, m: 12, y: 5786 },
    end: { d: 15, m: 12, y: 5786 },
    type: 'Lunar',
    desc: 'Total Lunar Eclipse visible in North/South America, Europe, Asia.'
  },
  {
    start: { d: 29, m: 5, y: 5786 },
    end: { d: 29, m: 5, y: 5786 },
    type: 'Solar',
    desc: 'Total Solar Eclipse visible in Europe, North America, Arctic.'
  },
  {
    start: { d: 15, m: 6, y: 5786 },
    end: { d: 15, m: 6, y: 5786 },
    type: 'Lunar',
    desc: 'Partial Lunar Eclipse visible in Europe, Africa, Americas.'
  },
  {
    start: { d: 1, m: 11, y: 5787 },
    end: { d: 1, m: 11, y: 5787 },
    type: 'Solar',
    desc: 'Annular Solar Eclipse visible in South America, Africa.'
  },
  {
    start: { d: 15, m: 12, y: 5787 },
    end: { d: 15, m: 12, y: 5787 },
    type: 'Lunar',
    desc: 'Penumbral Lunar Eclipse visible.'
  },
  {
    start: { d: 1, m: 5, y: 5787 },
    end: { d: 1, m: 5, y: 5787 },
    type: 'Solar',
    desc: 'Total Solar Eclipse (super-long duration) visible in North Africa/Middle East.'
  },
  {
    start: { d: 15, m: 6, y: 5787 },
    end: { d: 15, m: 6, y: 5787 },
    type: 'Lunar',
    desc: 'Partial Lunar Eclipse visible.'
  }
];

/**
 * Returns eclipse details if the Hebrew Date falls within any scheduled eclipse duration
 */
function getEclipseForDate(hd) {
  const abs = hd.abs();
  for (const ecl of ECLIPSE_LIST) {
    const startHDate = new HDate(ecl.start.d, ecl.start.m, ecl.start.y);
    const endHDate = new HDate(ecl.end.d, ecl.end.m, ecl.end.y);
    if (abs >= startHDate.abs() && abs <= endHDate.abs()) {
      return ecl;
    }
  }
  return null;
}

// --- UTILITY METHODS ---

/**
 * Returns clean month names depending on leap year status
 */
function getHebrewMonthMeta(monthIndex, year) {
  const isLeap = new HDate(1, 1, year).isLeapYear();
  if (isLeap && monthIndex === 12) {
    return { en: 'Adar I', he: 'אֲדָר א׳' };
  }
  return HEBREW_MONTH_NAMES[monthIndex] || { en: `Month ${monthIndex}`, he: `חודש ${monthIndex}` };
}



/**
 * Formats a Gregorian date nicely for titles
 */
function formatGregorianTitle(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Maps the standard lunar cycle phase to the day of the Hebrew month
 */
function getMoonPhaseForDay(day, totalDays) {
  if (day === 1) {
    return { emoji: '🌑', text: 'New Moon' };
  } else if (day > 1 && day < 7) {
    return { emoji: '🌒', text: 'Waxing Crescent' };
  } else if (day === 7 || day === 8) {
    return { emoji: '🌓', text: 'First Quarter' };
  } else if (day > 8 && day < 14) {
    return { emoji: '🌔', text: 'Waxing Gibbous' };
  } else if (day === 14 || day === 15) {
    return { emoji: '🌕', text: 'Full Moon' };
  } else if (day > 15 && day < 22) {
    return { emoji: '🌖', text: 'Waning Gibbous' };
  } else if (day === 22 || day === 23) {
    return { emoji: '🌗', text: 'Third Quarter' };
  } else {
    return { emoji: '🌘', text: 'Waning Crescent' };
  }
}

const ZODIAC_SIGNS = [
  { name: 'Aries', emoji: '♈' },
  { name: 'Taurus', emoji: '♉' },
  { name: 'Gemini', emoji: '♊' },
  { name: 'Cancer', emoji: '♋' },
  { name: 'Leo', emoji: '♌' },
  { name: 'Virgo', emoji: '♍' },
  { name: 'Libra', emoji: '♎' },
  { name: 'Scorpio', emoji: '♏' },
  { name: 'Sagittarius', emoji: '♐' },
  { name: 'Capricorn', emoji: '♑' },
  { name: 'Aquarius', emoji: '♒' },
  { name: 'Pisces', emoji: '♓' }
];

/** Geocentric ecliptic longitude (tropical, of date) in degrees [0, 360). */
function getGeocentricEclipticLongitude(bodyId, date) {
  if (bodyId === 'Moon') {
    const moon = Astronomy.EclipticGeoMoon(date);
    return ((moon.lon % 360) + 360) % 360;
  }
  if (bodyId === 'Sun') {
    return Astronomy.SunPosition(date).elon;
  }
  const time = Astronomy.MakeTime(date);
  const vec = Astronomy.GeoVector(bodyId, time, true);
  return ((Astronomy.Ecliptic(vec).elon % 360) + 360) % 360;
}

function getZodiacFromLongitude(longitude) {
  const signIndex = Math.floor(longitude / 30) % 12;
  return ZODIAC_SIGNS[signIndex];
}

/** Geocentric zodiac sign for a body as seen from Earth (default: Moon). */
function getGeocentricZodiacSign(date, bodyId = 'Moon') {
  return getZodiacFromLongitude(getGeocentricEclipticLongitude(bodyId, date));
}

/** True when a body enters a new geocentric sign during the given calendar day. */
function isGeocentricSignIngressDay(date, bodyId = 'Moon') {
  const startLon = getGeocentricEclipticLongitude(bodyId, date);
  const endOfDay = new Date(date.getTime() + 86400000 - 1);
  const endLon = getGeocentricEclipticLongitude(bodyId, endOfDay);
  const startSign = Math.floor(startLon / 30);
  const endSign = Math.floor(endLon / 30);
  if (startSign !== endSign) return true;
  const prevDay = new Date(date.getTime() - 86400000);
  const prevLon = getGeocentricEclipticLongitude(bodyId, prevDay);
  return Math.floor(prevLon / 30) !== startSign;
}

function formatZodiacPosition(longitude) {
  const zodiac = getZodiacFromLongitude(longitude);
  const rawDegrees = longitude % 30;
  const degrees = Math.floor(rawDegrees);
  const minutes = Math.round((rawDegrees - degrees) * 60);
  return { zodiac, degrees, minutes };
}

const PLANETS_CONFIG = [
  { id: 'Sun', name: 'Sun', emoji: '☀️' },
  { id: 'Moon', name: 'Moon', emoji: '🌙' },
  { id: 'Mercury', name: 'Mercury', emoji: '☿️' },
  { id: 'Venus', name: 'Venus', emoji: '♀️' },
  { id: 'Mars', name: 'Mars', emoji: '♂️' },
  { id: 'Jupiter', name: 'Jupiter', emoji: '♃' },
  { id: 'Saturn', name: 'Saturn', emoji: '♄' },
  { id: 'Uranus', name: 'Uranus', emoji: '⛢' },
  { id: 'Neptune', name: 'Neptune', emoji: '♆' },
  { id: 'Pluto', name: 'Pluto', emoji: '♇' }
];

// --- INITIALIZATION ---

function initializeApp() {
  // Sync state with current real-world date
  selectedDate = new HDate();
  currentHebrewYear = selectedDate.getFullYear();
  currentHebrewMonth = selectedDate.getMonth();

  // Populate Select drop downs
  populateSelectors();

  // Event Listeners
  selectMonth.addEventListener('change', (e) => {
    currentHebrewMonth = parseInt(e.target.value);
    renderCalendar();
  });

  selectYear.addEventListener('change', (e) => {
    currentHebrewYear = parseInt(e.target.value);
    // Adjust month selection if moving between leap and non-leap years
    populateSelectors();
    renderCalendar();
  });

  // Toggle filter panel dropdown
  btnFilter.addEventListener('click', (e) => {
    e.stopPropagation();
    filterPanel.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!filterPanel.contains(e.target) && e.target !== btnFilter && !btnFilter.contains(e.target)) {
      filterPanel.classList.add('hidden');
    }
  });

  // Render initial views
  renderCalendar();
  renderDayDetails(selectedDate);

  // Register Swipe Gestures on Calendar Grid
  let touchStartX = 0;
  let touchEndX = 0;

  calendarGrid.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  calendarGrid.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const deltaX = touchEndX - touchStartX;
    const threshold = 60; // minimum swipe distance in pixels

    if (deltaX > threshold) {
      // Swipe Right -> Previous Month
      navigateMonths(-1);
    } else if (deltaX < -threshold) {
      // Swipe Left -> Next Month
      navigateMonths(1);
    }
  }, { passive: true });

  // Register PWA service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((reg) => console.log('[PWA] Service Worker registered successfully', reg.scope))
        .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    });
  }
}

function populateSelectors() {
  // Clear lists
  selectMonth.innerHTML = '';
  selectYear.innerHTML = '';

  const isLeap = new HDate(1, 1, currentHebrewYear).isLeapYear();
  const numMonths = isLeap ? 13 : 12;

  // Months
  for (let m = 1; m <= numMonths; m++) {
    const meta = getHebrewMonthMeta(m, currentHebrewYear);
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = meta.en;
    if (m === currentHebrewMonth) opt.selected = true;
    selectMonth.appendChild(opt);
  }

  // Years (Hebrew Years 5785 to 5790)
  for (let y = 5785; y <= 5790; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentHebrewYear) opt.selected = true;
    selectYear.appendChild(opt);
  }
}

function navigateMonths(direction) {
  const isLeap = new HDate(1, 1, currentHebrewYear).isLeapYear();
  const numMonths = isLeap ? 13 : 12;

  currentHebrewMonth += direction;
  if (currentHebrewMonth < 1) {
    currentHebrewYear--;
    const prevYearLeap = new HDate(1, 1, currentHebrewYear).isLeapYear();
    currentHebrewMonth = prevYearLeap ? 13 : 12;
  } else if (currentHebrewMonth > numMonths) {
    currentHebrewYear++;
    currentHebrewMonth = 1;
  }

  populateSelectors();
  renderCalendar();
}

// --- RENDER HEBREW CALENDAR GRID ---

function renderCalendar() {
  calendarGrid.innerHTML = '';

  // Get active month metrics
  const hDateStart = new HDate(1, currentHebrewMonth, currentHebrewYear);
  const totalDays = hDateStart.daysInMonth();
  const gregStart = hDateStart.greg();
  const startDayOfWeek = gregStart.getDay(); // Sunday=0, Monday=1...

  const monthMeta = getHebrewMonthMeta(currentHebrewMonth, currentHebrewYear);

  // Update Headers
  titleHebrew.textContent = `${monthMeta.en} ${currentHebrewYear}`;

  // Find Gregorian months spanned by this Hebrew month
  const hDateEnd = new HDate(totalDays, currentHebrewMonth, currentHebrewYear);
  const gregEnd = hDateEnd.greg();

  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedGregStart = gregStart.toLocaleDateString('en-US', options);
  const formattedGregEnd = gregEnd.toLocaleDateString('en-US', options);
  subtitleGregorian.textContent = `${formattedGregStart} – ${formattedGregEnd}`;

  // Fetch all holidays and Omer dates in the spanned Gregorian range (+/- 1 day buffer)
  const queryStart = new Date(gregStart.getTime() - 86400000);
  const queryEnd = new Date(gregEnd.getTime() + 86400000);
  
  let events = [];
  try {
    events = HebrewCalendar.calendar({
      start: queryStart,
      end: queryEnd,
      omer: true,
      sedrot: true,
      noModern: false
    });
  } catch (err) {
    console.error('Failed to retrieve Hebrew calendar events:', err);
  }

  // 1. Weekday Alignment Padding Cells
  for (let p = 0; p < startDayOfWeek; p++) {
    const padCell = document.createElement('div');
    padCell.className = 'rounded-2xl border border-dashed border-slate-900 bg-slate-950/20 opacity-30 select-none pointer-events-none min-h-[50px]';
    calendarGrid.appendChild(padCell);
  }

  // 2. Active Hebrew Days Cells
  for (let d = 1; d <= totalDays; d++) {
    const hd = new HDate(d, currentHebrewMonth, currentHebrewYear);
    const greg = hd.greg();
    const gregDay = greg.getDate();
    const isToday = hd.isSameDate(new HDate());
    const isSelected = hd.isSameDate(selectedDate);
    const dayOfWeek = greg.getDay();

    const isRoshChodesh = (d === 1 || d === 30);
    const isShabbat = (dayOfWeek === 6);

    // Filter events matching this specific Hebrew date
    const hdString = hd.toString();
    const dayEvents = events.filter(e => e.getDate().toString() === hdString);

    // Moon phase
    const moon = getMoonPhaseForDay(d, totalDays);

    // Check Eclipse Lookups (supports durations)
    const eclipse = getEclipseForDate(hd);

    // Build the grid cell container
    const cell = document.createElement('div');
    
    // Core glassmorphic styling
    let borderStyles = 'border-slate-800 bg-slate-900/30';
    let hoverStyles = 'hover:border-slate-700 hover:bg-slate-900/60';
    let shadowStyles = '';

    if (isSelected) {
      borderStyles = 'border-amber-500/70 bg-amber-500/10';
      shadowStyles = 'shadow-[0_0_15px_rgba(245,158,11,0.08)]';
    } else if (isToday) {
      borderStyles = 'border-emerald-500/60 bg-emerald-500/10';
    } else if (isRoshChodesh) {
      borderStyles = 'border-emerald-500/25 bg-emerald-500/5';
    } else if (isShabbat) {
      borderStyles = 'border-indigo-500/25 bg-indigo-500/5';
    }

    cell.className = `flex flex-col justify-between p-2 rounded-2xl border backdrop-blur-sm cursor-pointer select-none active:scale-95 transition-all duration-300 min-h-[64px] md:min-h-[78px] ${borderStyles} ${hoverStyles} ${shadowStyles}`;
    cell.dataset.hebrewDay = d;

    // Row 1: Day number (H), only the number (Arabic numeral), with dots next to it
    const row1 = document.createElement('div');
    row1.className = 'flex justify-between items-center w-full';
    
    const numAndDots = document.createElement('div');
    numAndDots.className = 'flex items-center gap-1.5';
    
    const hNum = document.createElement('span');
    hNum.className = 'text-xs font-bold font-sans tracking-tight text-slate-100';
    hNum.textContent = d;
    numAndDots.appendChild(hNum);

    // Color dots for important Hebrew days next to the number
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'flex gap-0.5 items-center';

    dayEvents.forEach(ev => {
      const desc = ev.getDesc();

      // Skip dots for Omer counting to prevent daily grid clutter
      if (desc.includes('Omer')) {
        return;
      }

      const dot = document.createElement('span');

      // Color coding events matching the new Legend
      let dotColor = 'bg-indigo-500'; // Standard Shabbat/Holiday (Indigo)
      if (desc.includes('Rosh Chodesh')) {
        dotColor = 'bg-emerald-500';  // Rosh Chodesh (Emerald)
      } else if (desc.includes('Tzom') || desc.includes('Fast') || desc.includes('Av') || desc.includes('Asara')) {
        dotColor = 'bg-amber-500';    // Fast Days (Amber)
      }
      
      dot.className = `w-1 h-1 rounded-full ${dotColor}`;
      dotsContainer.appendChild(dot);
    });
    numAndDots.appendChild(dotsContainer);
    row1.appendChild(numAndDots);

    // Row 2: Gregorian Number Mapping
    const row2 = document.createElement('div');
    row2.className = 'flex justify-between items-end mt-0.5';

    const gNum = document.createElement('span');
    gNum.className = 'text-[9px] font-bold text-slate-500 uppercase tracking-tighter';
    
    let gDisplay = '';
    if (d === 1) {
      const monthStr = greg.toLocaleDateString('en-US', { month: 'short' });
      gDisplay = `${greg.getDate()}-${monthStr}`; // Format dd-mmm (G) on Day 1 of month (H)
    } else if (greg.getDate() === 1) {
      const monthStr = greg.toLocaleDateString('en-US', { month: 'short' });
      gDisplay = `${greg.getDate()}-${monthStr}`; // Format dd-mmm (G) on Day 1 of month (G)
    } else {
      gDisplay = greg.getDate(); // Just the number for other days
    }
    gNum.textContent = gDisplay;

    // Moon and Event indicators (only moon phase/zodiac/eclipses go here now)
    const row3 = document.createElement('div');
    row3.className = 'flex items-center mt-1 justify-between w-full';

    // Left group: Moon Phase Change Emoji
    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center';
    const isPhaseChangeDay = (d === 1 || d === 7 || d === 15 || d === 22);
    if (isPhaseChangeDay) {
      const moonSpan = document.createElement('span');
      moonSpan.className = 'text-[11px] leading-none opacity-95';
      moonSpan.textContent = moon.emoji;
      leftGroup.appendChild(moonSpan);
    }
    row3.appendChild(leftGroup);

    // Right group: Zodiac Sign Badge
    const rightGroup = document.createElement('div');
    rightGroup.className = 'flex items-center';
    if (isGeocentricSignIngressDay(greg, 'Moon')) {
      const zodiac = getGeocentricZodiacSign(greg, 'Moon');
      const zodiacSpan = document.createElement('span');
      zodiacSpan.className = 'text-[11px] leading-none opacity-60';
      zodiacSpan.textContent = zodiac.emoji;
      zodiacSpan.title = `Moon enters ${zodiac.name}`;
      rightGroup.appendChild(zodiacSpan);
    }
    row3.appendChild(rightGroup);
    
    // Add glowing circular border for real eclipses!
    if (eclipse) {
      cell.classList.add('ring-1', 'ring-rose-500/40');
      const eclipseBadge = document.createElement('span');
      eclipseBadge.className = 'text-[8px] font-black text-rose-500 uppercase tracking-tighter self-end bg-rose-500/10 px-1 rounded border border-rose-500/20';
      eclipseBadge.textContent = 'ECL';
      row1.appendChild(eclipseBadge);
    }

    cell.appendChild(row1);
    cell.appendChild(row2);
    row2.appendChild(gNum);
    cell.appendChild(row3);

    // Selection listener
    cell.addEventListener('click', () => {
      selectedDate = new HDate(d, currentHebrewMonth, currentHebrewYear);
      renderCalendar();
      renderDayDetails(selectedDate);
    });

    calendarGrid.appendChild(cell);
  }
}

// --- RENDER DAY DETAILS & TIMELINE DRAWER ---

function renderDayDetails(hd) {
  const d = hd.getDate();
  const m = hd.getMonth();
  const y = hd.getFullYear();
  const dayOfWeek = hd.greg().getDay();
  const totalDays = hd.daysInMonth();
  
  const monthMeta = getHebrewMonthMeta(m, y);
  const gregDate = hd.greg();
  const prevGregDate = new Date(gregDate.getTime() - 86400000);

  // 1. Day headers updates
  dayViewTitleHebrew.textContent = `${d} ${monthMeta.en} ${y}`;
  dayViewTitleGregorian.textContent = formatGregorianTitle(gregDate);

  // 2. Setup dates and boundaries labels on the timeline
  const optSunset = { month: 'short', day: 'numeric' };
  labelSunsetPrev.textContent = `Sunset (${prevGregDate.toLocaleDateString('en-US', optSunset)}) to Sunrise (${gregDate.toLocaleDateString('en-US', optSunset)})`;
  labelSunriseToday.textContent = `Sunrise to Sunset (${gregDate.toLocaleDateString('en-US', optSunset)})`;

  // 3. Moon Phase Details
  const moon = getMoonPhaseForDay(d, totalDays);
  dayViewMoonIcon.textContent = moon.emoji;
  dayViewMoonText.textContent = moon.text;

  // 3b. Zodiac Details
  const moonZodiac = getGeocentricZodiacSign(gregDate, 'Moon');
  dayViewZodiacIcon.textContent = moonZodiac.emoji;
  dayViewZodiacText.textContent = moonZodiac.name;

  // 6. Partition Events into Sunset-Transition Timeline (Night vs Day)
  timelineNightEvents.innerHTML = '';
  timelineDayEvents.innerHTML = '';

  // Get events on this date
  const queryStart = new Date(gregDate.getTime() - 86400000);
  const queryEnd = new Date(gregDate.getTime() + 86400000);
  
  let events = [];
  try {
    events = HebrewCalendar.calendar({
      start: queryStart,
      end: queryEnd,
      omer: true,
      sedrot: true,
      noModern: false
    });
  } catch (err) {
    console.error('Timeline generation failed:', err);
  }

  const hdString = hd.toString();
  const dayEvents = events.filter(e => e.getDate().toString() === hdString);

  // Lists of night-themed and day-themed items
  const nightItems = [];
  const dayItems = [];

  // Static rules for partitioning events
  dayEvents.forEach(ev => {
    const desc = ev.getDesc();
    const memo = ev.render('en');
    
    let target = 'day';

    // Rules for placing in Night
    if (
      desc.includes('Candle lighting') ||
      desc.includes('Kol Nidre') ||
      desc.includes('Pesach Seder') ||
      desc.includes('Eve') ||
      desc.includes('Megillah') && memo.toLowerCase().includes('evening') ||
      desc.includes('Omer') // Omer is counted at night
    ) {
      target = 'night';
    }

    if (target === 'night') {
      nightItems.push(ev);
    } else {
      dayItems.push(ev);
    }
  });

  // Render Night Items
  if (nightItems.length === 0) {
    timelineNightStatus.textContent = 'No nighttime occurrences. The evening starts calmly at sunset.';
    timelineNightStatus.classList.remove('hidden');
  } else {
    timelineNightStatus.classList.add('hidden');
    nightItems.forEach(ev => {
      const card = createEventTimelineCard(ev, 'night');
      timelineNightEvents.appendChild(card);
    });
  }

  // Render Day Items
  if (dayItems.length === 0) {
    timelineDayStatus.textContent = 'Standard calendar day without major festivals.';
    timelineDayStatus.classList.remove('hidden');
  } else {
    timelineDayStatus.classList.add('hidden');
    dayItems.forEach(ev => {
      const card = createEventTimelineCard(ev, 'day');
      timelineDayEvents.appendChild(card);
    });
  }

  // 7. Eclipse Warning Alerts (Shown below transition grid)
  const eclipse = getEclipseForDate(hd);
  if (eclipse) {
    dayEclipseWarning.classList.remove('hidden');
    dayEclipseWarning.classList.add('flex');
    dayEclipseText.textContent = `${eclipse.type} Eclipse: ${eclipse.desc}`;
  } else {
    dayEclipseWarning.classList.add('hidden');
    dayEclipseWarning.classList.remove('flex');
  }

  // 8. Planetary Positions (geocentric ecliptic longitudes via astronomy-engine)
  dayPlanetsList.innerHTML = '';
  try {
    PLANETS_CONFIG.forEach(planet => {
      const longitude = getGeocentricEclipticLongitude(planet.id, gregDate);
      const { zodiac, degrees, minutes } = formatZodiacPosition(longitude);

      const row = document.createElement('div');
      row.className = 'flex justify-between items-center bg-white/[0.02] border border-white/[0.04] p-2 rounded-xl backdrop-blur-sm';
      
      const planetCol = document.createElement('div');
      planetCol.className = 'flex items-center gap-1.5 font-medium';
      planetCol.innerHTML = `<span class="text-sm leading-none">${planet.emoji}</span> <span class="text-slate-200 font-semibold">${planet.name}</span>`;
      
      const positionCol = document.createElement('div');
      positionCol.className = 'flex items-center gap-1 text-[11px] font-mono text-indigo-300 font-bold';
      positionCol.innerHTML = `<span>${zodiac.emoji}</span> <span class="text-slate-400 font-normal uppercase tracking-wider text-[9px]">${zodiac.name.substring(0, 3)}</span> <span>${degrees}°${minutes.toString().padStart(2, '0')}'</span>`;
      
      row.appendChild(planetCol);
      row.appendChild(positionCol);
      dayPlanetsList.appendChild(row);
    });
  } catch (err) {
    console.error('[Astronomy] Failed to calculate planetary positions:', err);
    dayPlanetsList.innerHTML = '<p class="col-span-2 text-slate-500 italic text-center p-2">Positions temporarily unavailable</p>';
  }
}

/**
 * Creates visual cards styled for the timeline grids
 */
function createEventTimelineCard(ev, timeOfDay) {
  const container = document.createElement('div');
  
  let bgStyles = 'bg-indigo-950/20 border-indigo-500/20';
  let badgeColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';

  if (timeOfDay === 'day') {
    bgStyles = 'bg-amber-950/10 border-amber-500/20';
    badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  const desc = ev.getDesc();
  if (desc.includes('Rosh Chodesh')) {
    bgStyles = 'bg-emerald-950/15 border-emerald-500/20';
    badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }

  container.className = `flex flex-col gap-1 p-2.5 rounded-xl border ${bgStyles} animate-fade-in`;

  const header = document.createElement('div');
  header.className = 'flex justify-between items-center w-full';

  const title = document.createElement('span');
  title.className = 'text-[11px] font-bold text-slate-200';
  title.textContent = ev.render('en');

  const cat = document.createElement('span');
  cat.className = `text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${badgeColor}`;
  
  // Categorize
  let categoryLabel = 'EVENT';
  if (desc.includes('Omer')) categoryLabel = 'OMER';
  else if (desc.includes('Rosh Chodesh')) categoryLabel = 'CHODESH';
  else if (desc.includes('Shabbat')) categoryLabel = 'SHABBAT';
  else if (desc.includes('Candle')) categoryLabel = 'MITZVAH';
  
  cat.textContent = categoryLabel;

  header.appendChild(title);
  header.appendChild(cat);
  container.appendChild(header);

  return container;
}

// --- APP LAUNCH ---
window.addEventListener('DOMContentLoaded', initializeApp);
