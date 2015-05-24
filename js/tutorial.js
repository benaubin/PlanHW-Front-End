var PlanHWTour;

PlanHWTour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-arrows'
  }
});

PlanHWTour.addStep({
    title: 'Welcome to PlanHW',
    text: 'Hey! Welcome to PlanHW',
    attachTo: '.planhw-branding bottom'
}).addStep({
    title: 'This is your homework dashboard.',
    text: "When you add homework, you'll see it right here :)"
}).addStep({
    title: 'You have no homework.',
    text: "You have no homework.<br> That means PlanHW can't help you<br> - at all. So let's fix that."
}).addStep({
    title: "Let's add some homework.",
    text: "Just click here and start typing.",
    attachTo: '#homework bottom',
    advanceOn: '#homework_input keydown',
    buttons: false
}).addStep({
    title: "See? It's pretty simple.",
    text: "Try adding an assignment called 'Math Packet'"
}).addStep({
    title: 'Now, let\'s set a due date.',
    text: 'Just click here and pick a date',
    attachTo: '#hwpreview left',
    advanceOn: '#homework_due click'
}).addStep({
    title: 'Now, click create.',
    text: 'The button the says create does exactly what you think it does.',
    attachTo: '#hwpreview left'
})