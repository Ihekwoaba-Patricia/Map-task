'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//GEOLOCATION MAP(REFACTURED USING CLASS)

class Workout{
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration){
    this.coords = coords;//[lat, lng]
    this.distance = distance;//in km
    this.duration = duration;//in min
  }

  _setDescription() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
};

class Running extends Workout{
  type = 'running'; //this will be available on all instances
  constructor(coords, distance, duration, cadence){
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
    //this.type = 'running'; //this is the same as stated above the constructor
  }

  calcPace() {
    //min/ke
    this.pace = this.duration / this.distance;
    return this.pace
  }

}

class Cycling extends Workout{
  type = 'cycling'; //this will be available on all instances
  constructor(coords, distance, duration, elevationGain){
    super(coords, distance, duration)
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
    //this.type = 'cycling'; //this is the same as stated above the constructor
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60) ;
    return this.speed
  }
}
/* const run1 = new Running([39,-12], 5.2, 24, 178);
const cyc1 = new Cycling([39,-17], 27, 95, 523);
console.log(run1, cyc1); */



////////////////////////////////////////
//APPLICATION ARCHITECTURE
class App{
  #map;
  #mapZoomLEvel = 13;
  #mapEvent;
  #workouts = [];

  constructor(){
    //get users position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();


    form.addEventListener('submit',this._newWorkout.bind(this))//use bind so that the this keyword will point to the App object function if not it will point to the form element 
    
    inputType.addEventListener('change', this._toggleElevatedField);

    //using delegation method to shift the map closer base on desired click
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

  }

  _getPosition() {
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),function() {//you use bind it to avoid error of undefined
        alert('Could not get your location');
      })
      };
  }

  _loadMap(position){
      const {latitude} = position.coords;
      const {longitude} = position.coords;
      console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    
    //leaflet link for map(third party library)
    const coords = [latitude,longitude]
    this.#map = L.map('map').setView(coords, this.#mapZoomLEvel);
    
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);
    
    //handling clicks on map
      this.#map.on('click', this._showForm.bind(this)) //this act as addEventListener

      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });  
  }

  _showForm(mapE){
    this.#mapEvent = mapE
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    //To replace the input form with the rendering list(decription list)
    form.style.display ='none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000)
  }

  _toggleElevatedField(){
 //how to inter-swtich btw elevation and cadence
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e){
    //arrow function to check if the input are valid.
    //When you use rest parameter like this it will return an array. using the every() method, it will loop over the array to check if it is finite/number or not and return 'true/false' if the values are true/false for all of them
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    //Arrow function for positive value 
    const allPositiveValues = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Get data from form
    const type  = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const {lat, lng} = this.#mapEvent.latlng;
    let workout;

    //If workout running, create runnng object
    if(type === 'running'){
      const cadence = +inputCadence.value;
      //Check if data is valid
      //use a guide clause: it means that you will basically check the opposite of what we are originally interested in and if the opposite is true then we simply return the function immediately.
    if(
     /*  !Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence) */
     !validInputs(distance, duration, cadence) || ! allPositiveValues(distance, duration, cadence)
      ) 
      return alert('Inputs have to be positive numbers!')

    workout = new Running([lat, lng], distance, duration, cadence)
    
    }

    //If workout cycling, create cycling object
    if(type === 'cycling'){
      const elevation = +inputElevation.value;
    
      if(!validInputs(distance, duration, elevation) || ! allPositiveValues(distance, duration)
      ) 
      return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation)
   
    }

    //Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout)
{

}
    //render workout list
    this._renderWorkout(workout)
    
    //Hide form + clear input field values
    this._hideForm();

     //Set local storage to all workouts
    this._setLocalStorage();

  }

 
  _renderWorkoutMarker(workout) {
    //console.log(this.#mapEvent)
    L.marker(workout.coords)
    .addTo(this.#map)
    .bindPopup(L.popup({//get data from the leaflet doc library
      maxWidth: 250, 
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,})
    )
    .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
    .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
      <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if(workout.type === 'running')
    html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👣</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `

    if(workout.type === 'cycling')
    html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li>

    `;
  form.insertAdjacentHTML('afterend', html);
}

_moveToPopup(e) {
  const workoutEl = e.target.closest('.workout')
  //guide clause
  if(!workoutEl) return;

  const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

  //them move the map base on click
  this.#map.setView(workout.coords, this.#mapZoomLEvel, {
    animate: true,
    pan: {
      duration:1
    },
  });

//using the public interface
 // workout.click();
}

_setLocalStorage() {
  localStorage.setItem('workouts', JSON.stringify(this.#workouts))
}

_getLocalStorage() {
  const data = JSON.parse(localStorage.getItem('workouts'));

  //guide clause
  if(!data) return;
//assign the local storage data to the workout to be loaded at the begining
  this.#workouts = data;

  //loop over the arrays in the workout
  this.#workouts.forEach(work => {
    this._renderWorkout(work);
  });

}

reset() {
  localStorage.removeItem('workouts');
  location.reload();
}

};
const mapApp = new App();













/* //HOW GEOLOCATION WORKS(ROUGH WORK)

let map, mapEvent;

if(navigator.geolocation){
navigator.geolocation.getCurrentPosition(function(position){
  const {latitude} = position.coords;
  const {longitude} = position.coords;
  console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

//leaflet link for map(third party library)
const coords = [latitude,longitude]
map = L.map('map').setView(coords, 13);

L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

//handling clicks on map
  map.on('click', function(mapE){ //this act as addEventListener
    mapEvent = mapE
    form.classList.remove('hidden');
    inputDistance.focus();
   
  })
}, function() {
  alert('Could not get your location');
})
};


form.addEventListener('submit', function(e){
  e.preventDefault();

  //clear input field values
inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

  //display marker
    console.log(mapEvent);
    const {lat, lng} = mapEvent.latlng;

    L.marker([lat, lng])
    .addTo(map)
    .bindPopup(L.popup({//get data from the leaflet doc library
      maxWidth: 250, 
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: 'running-popup',})
    )
    .setPopupContent('Workout')
    .openPopup(); 
});

inputType.addEventListener('change', function(){
  //how to inter-swtich btw elevation and cadence
  inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
})

 */
