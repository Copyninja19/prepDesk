const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, limit, required = false) =>
  typeof value === 'string' && value.length <= limit && (!required || Boolean(value.trim()));
const number = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min, max) => Number.isInteger(value) && number(value, min, max);
const id = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value);
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
};
const records = (items, valid) => Array.isArray(items) &&
  items.every(item => object(item) && id(item.id) && valid(item)) &&
  new Set(items.map(item => item.id)).size === items.length;

const activity = item => ['DSA','Backend','Projects','Interview'].includes(item.type) &&
  text(item.topic,80,true) && text(item.title,140,true);
const prep = value => object(value) && text(value.stack,100) && integer(value.goal,1,7) &&
  records(value.queue, item => activity(item) && integer(item.minutes,1,1440)) &&
  records(value.logs, item => activity(item) && date(item.date) &&
    integer(item.minutes,0,1440) && text(item.notes ?? '',1000));

function wellness(value) {
  if (!object(value) || !text(value.name,100) ||
      !records(value.subjects, subject => text(subject.title,100,true) &&
        records(subject.units, unit => text(unit.title,100,true) &&
          text(unit.notes ?? '',2000) && typeof unit.done === 'boolean'))) return false;
  const subjects = new Set(value.subjects.map(subject => subject.id));
  return records(value.exams, exam => subjects.has(exam.subject) && date(exam.date) &&
    (exam.time == null || exam.time === '' || (typeof exam.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(exam.time))) &&
    text(exam.location ?? '',100)) &&
    records(value.meals, meal => date(meal.date) && ['Breakfast','Lunch','Dinner','Snack'].includes(meal.group) &&
      typeof meal.food === 'string' && /^(custom|\d{1,2})$/.test(meal.food) &&
      text(meal.title,100,true) && text(meal.serving,100,true) && number(meal.quantity,.01,10000) &&
      Array.isArray(meal.nutrients) && meal.nutrients.length === 4 &&
      meal.nutrients.every(value => number(value,0,10000)));
}

function validEntries(entries) {
  return object(entries) && Object.keys(entries).every(key => {
    if (key === 'prep-desk-v1') return prep(entries[key]);
    if (key === 'prep-desk-college-diet-v1') return wellness(entries[key]);
    return false;
  });
}
