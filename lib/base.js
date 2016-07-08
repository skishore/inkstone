// Prints the message and throws an error if the conditionis false.
const assert = (condition, message) => {
  if (!condition) {
    console.error(message);
    throw new Error;
  }
}

// Returns a Unix timestamp (the time, in seconds, since January 1st, 1970).
Date.timestamp = () => Math.floor(Date.now() / 1000);

// Returns a hash of the given string equal to Java's String hash.
String.prototype.hash = function() {
  let result = 0;
  for (let i = 0; i < this.length; i++) {
    result = (result << 5) - result + this.charCodeAt(i);
    result = result & result;
  }
  return result;
}
export {assert};
