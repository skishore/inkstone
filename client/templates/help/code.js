const params = new ReactiveVar();

Template.demo.helpers({
  params() {
    return params.get();
  },
  transform() {
    return params.get() ? 'translateY(0)' : undefined;
  },
});

Template.help.events({
  'click .item.help-item': function(event) {
    console.log(this.help);
  },
});

window.params = params;
