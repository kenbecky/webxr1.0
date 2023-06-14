/* 
undo/redo buttons don't work for background
*/
let fieldsets = document.getElementsByTagName("fieldset");
const svg = document.querySelector("#svg-container svg");
const coordinatesElem = document.getElementById("coordinates");
const shapeFieldset = document.getElementById("shape");
const strokeSelector = document.querySelector("#color input[name=stroke]");
const fillSelector = document.querySelector("#color input[type=color][name=fill]");
const fillCheckbox = document.querySelector("#color input[type=checkbox][name=fill]");
let displayBtn = document.getElementById("display-code");
const codeBox = document.getElementById("svg-code");
const colorFieldset = document.getElementById("color");
let backgroundSelector = colorFieldset.querySelector("input[type=color][name=background]");
let backgroundCheckbox = colorFieldset.querySelector("input[type=checkbox][name=background]");
const backgroundBtn = document.getElementById("backgroundBtn");
let widthSelector = document.querySelector("input[name=stroke-width]");
const linecapFieldset = document.getElementById("linecap");

for (let element of fieldsets) {
Object.defineProperty(element, "value", {
    get() { 
    let radioBtns = this.querySelectorAll("input");
    for (let input of radioBtns) {
        if (input.checked && input.type == "radio") {
        return input.value;
        }
    }
    },
    set(value) { 
    let radioBtns = this.querySelectorAll("input");
    for (let input of radioBtns) {
        if (input.value == value && input.type == "radio") {
        input.checked = true;
        }
    }
    },
    enumerable: true,
    configurable: true
}
);
}

let useInlineStyle = false; // use inline style or attributes for svg elements
let current; // current Element
let mouseDownX; //= undefined;
let mouseDownY; //= undefined;
let pointsSoFar; 


const squareOf = x => x * x;
/*
const keyHandlers = {};
document.addEventListener("keydown", (event) => {
const key = event.key;
if (keyHandlers[key]) {
    keyHandlers[key](event);
}
});
*/
const recordOfActions = {
list: [],
length: 0,

at(index) { 
    if ((typeof(index) == "number") && (index < 0)) { 
    index = index + this.length; 
    }
    return this.list[index]; 
},
"get": this.at,
"set": function setAtIndex(index, value) {
    if (index < 0) {
    index = index + this.length;
    }
    if (index < this.list.length) {
    this.list[index] = value;
    return true;
    }
    else {
    return false;
    }
},

push(element) { 
    const length = this.length;
    const extraLength = this.list.length - length;
    let extras = null; 
    if (extraLength > 0) {
    extras = new Array(extraLength);
    for (let i = 0; i < extraLength; i++) {
        extras[i] = this.list[i + length];
    }
    this.list[length] = element;
    }
    else {
    this.list.push(element);
    }
    this.length++;
    this.list.length = this.length; // shorten internal array
    return extras;
},
pop() {
    this.length--;
    return this.list[this.length];
},

get last() { return this.list[this.length - 1]; },
set last(element) { 
    if (this.list[this.length - 1] != element) {
    this.pop(); 
    this.push(element);
    }
},

indexOf(element) { 
    for (let i = 0; i < this.length; i++) {
    if (this.at(i) === element) {
        return i;
    }
    }
    return -1;
},
includes(element) {
    return (this.indexOf(element) > 0);
},

[Symbol.iterator]() {
    const iterable = this;
    const length = this.length;
    return {
    index: 0,
    next(i) {
        const value = iterable.at(this.index);
        const done = !(this.index < length);
        if (typeof(i) == "number") {
        this.index = Math.floor(i);
        }
        this.index++;
        return { value, done };
    }
    }
},

add(element) { // add only if not in array
    if (this.indexOf(element) < 0) { // not already in array
    this.push(element);
    }
}
}

for (let element of document.getElementsByClassName("stroke-demo")) {
element.addEventListener("click", function setStrokeWidth(event) {
    let target = event.target;
    if (!target.hasAttribute("style") || !target.style.height) {
    target = event.target.querySelector(`*[style*="height"]`);
    }
    let value = 0;
    if (target) {
    value = parseInt(target.style.height);
    }
    if (!Number.isNaN(value)) {
    widthSelector.value = value;
    }
});
};

displayBtn.addEventListener("click", function showSVGcode() {
let code = document.getElementById("svg-container").innerHTML;
code = code.trim();
let h = code.indexOf(">");
code = code.substring(0, h + 1) + "\n" + code.substring(h + 1).trim();
let length = code.length;
// insert '\n' before each element
for (let i = h + 3; i < length - 5; i++) {
    if (code[i] == "<") {
    if ((code.substring(i, i +2 ) != "</" ) 
            && (code[i-1] != "<\n") && (code[i-1] != "<\r")) 
    { // insert \n before code[i]
        code = code.substring(0, i) + "\n" + code.substring(i);
        length++;
        i++
    }
    }
}
const ending = "</svg>".length; // 6
code = code.substring(0, length - ending) + "\n</svg>";
codeBox.textContent = code;
codeBox.classList.remove("invisible");
codeBox.focus();
});

// object to keep track of event listeners for shapes in the svg
const eventListeners = {
"set": function replace(eventType, listener, options) { 
    if (typeof(options) == 'string') {
    let obj = {};
    obj[options] = true;
    options = obj;
    }
    svg.removeEventListener(eventType, this[eventType]);
    this[eventType] = listener;
    svg.addEventListener(eventType, listener, options); 
},
remove: function remove(eventType, listener, options) {
    if (!listener) { listener = this[eventType]; }
    svg.removeEventListener(eventType, listener, options);
    delete this[eventType];
},
removeAll: function removeAll() {
    for (let property in this) {
    if (property == "set" || property == "remove" || property == "removeAll") {
        continue;
    }
    else if (property) {
        //console.log(this[property]);
        svg.removeEventListener(property, this[property]);
        this[property] = null;
    }
    }
}
}; 

//const createElement = (tagName) => document.createElementNS('http://www.w3.org/2000/svg', tagName)

const defineProperties = (element) => {

function setStyle(property, val) { 
    if (typeof(val) == "number") {
    val = Math.round(val);
    }
    this.style.setProperty(property, val);
    return false; 
}
function setAttribute(attr, val) { 
    if (typeof(val) == "number") {
    val = Math.round(val);
    }
    this.setAttribute(attr, val); 
    return true;
}

element.removeSelf = element.remove;
if (!element.removeSelf) {
    if (element.parentNode) {
    element.removeSelf = function removeSelf() { 
        this.parentNode.removeChild(this);  
    }
    }
}
Object.defineProperty(element, "removeSelf", {
    enumerable: false,
    configurable: true
});

Object.defineProperty(element, "set", {
    value: (useInlineStyle) ? setStyle : setAttribute,
    enumerable: false,
    configurable: true
});
Object.defineProperty(element, "get", {
    value: function getAttr(attr, useComputedStyle) {
    let result = this.getAttribute(attr);
    if (!result) {
        result = this.style.getPropertyValue(attr);
    }
    if (!result && Window && useComputedStyle) {
        result = Window.getComputedStyle(this).getPropertyValue(attr);
    }
    return result;
    },
    enumerable: false,
    configurable: true
});
Object.defineProperty(element, "remove", {
    value: function remove(attr) {
    if (attr == undefined) {
        this.removeSelf();
        return;
    }
    this.removeAttribute(attr);
    this.style.removeProperty(attr);
    if (this.getAttribute("style") === "") {
        this.removeAttribute("style");
    }
    },
    enumerable: false,
    configurable: true
});
return element;
}

defineProperties(svg);

const createElement = (tagName) => {
const element = document.createElementNS('http://www.w3.org/2000/svg', tagName); 
defineProperties(element);
return element;
}

const onMouseDown = (e) => {
mouseDownX = e.offsetX;
mouseDownY = e.offsetY;
}

const setWidth = (width) => {
svg.width = width;
svg.viewBox.baseVal.width = width;
};
const setHeight = (height) => {
svg.height = height;
svg.viewBox.baseVal.height = height;
};

function showCoordinates(e) {
const x = e.offsetX;
const y = e.offsetY;
coordinatesElem.innerText = `(${x}, ${y})`;
}
function clearStuff(e) {
coordinatesElem.innerHTML = "&nbsp;";
}
svg.addEventListener("mousemove", showCoordinates);
svg.addEventListener("mouseenter", showCoordinates);
svg.addEventListener("mouseleave", clearStuff);
svg.addEventListener("mousedown", onMouseDown);
//svg.addEventListener("mouseup", () => {console.log(`(${mouseDownX},${mouseDownY})`);} );

const draw = {

line: function makeLine(e) {
    current.setAttribute("x1", mouseDownX);
    current.setAttribute("y1", mouseDownY);
    current.setAttribute("x2", e.offsetX);
    current.setAttribute("y2", e.offsetY);
},

rect: function makeRect(e) {
    current.set("x", Math.min(mouseDownX, e.offsetX));
    current.set("y", Math.min(mouseDownY, e.offsetY));
    current.set("width" , Math.abs(e.offsetX - mouseDownX));
    current.set("height", Math.abs(e.offsetY - mouseDownY));
},

circle: function makeCircle(e) {
    const d = Math.sqrt( 
    squareOf(mouseDownX - e.offsetX) + squareOf(mouseDownY - e.offsetY)
    );
    const midpointX = (mouseDownX + e.offsetX) / 2;
    const midpointY = (mouseDownY + e.offsetY) / 2;
    current.set("cx", midpointX);
    current.set("cy", midpointY);
    current.set("r", d / 2);
},

ellipse: function makeEllipse(e) {
    const dx = Math.abs(mouseDownX - e.offsetX);
    const dy = Math.abs(mouseDownY - e.offsetY);
    const cx = (mouseDownX + e.offsetX) / 2;
    const cy = (mouseDownY + e.offsetY) / 2;
    current.set("cx", cx);
    current.set("cy", cy);
    current.set("rx", dx * Math.SQRT1_2);
    current.set("ry", dy * Math.SQRT1_2);
}
}

const drawFromCenter = {

line: function makeLine(e) {
    const x1 = e.offsetX;
    const y1 = e.offsetY;
    current.setAttribute("x1", x1);
    current.setAttribute("y1", y1);
    current.setAttribute("x2", (2 * mouseDownX) - x1);
    current.setAttribute("y2", (2 * mouseDownY) - y1);
},

rect: function makeRect(e) {
    const x1 = e.offsetX;
    const y1 = e.offsetY;
    const x2 = (2 * mouseDownX) - x1;
    const y2 = (2 * mouseDownY) - y1;
    current.set("x", Math.min(x1, x2));
    current.set("y", Math.min(y1, y2));
    current.set("width" , Math.abs(x2 - x1));
    current.set("height", Math.abs(y2 - y1));
},

circle: function makeCircle(e) {
    const r = Math.sqrt( 
    squareOf(mouseDownX - e.offsetX) + squareOf(mouseDownY - e.offsetY)
    );
    current.set("cx", mouseDownX);
    current.set("cy", mouseDownY);
    current.set("r", r);
},

ellipse: function makeEllipse(e) {
    const rx = Math.abs(mouseDownX - e.offsetX);
    const ry = Math.abs(mouseDownY - e.offsetY);
    current.set("cx", mouseDownX);
    current.set("cy", mouseDownY);
    current.set("rx", rx * Math.SQRT2);
    current.set("ry", ry * Math.SQRT2);
}
}

const getFill = () => {
let fill = fillSelector.value;
if (!fillCheckbox.checked) {
    fill = "none";
}
return fill;
}

const linejoin = {
"butt": "bevel",
"round": "round",
"square": "miter"
}

function enableDrawing(e) {
const target = e.target;
const shape = target.value;
if (shape == "line" || shape == "rect") {
    linecapFieldset.style.removeProperty("display");
}
else {
    linecapFieldset.style.display = "none";
}
let ondrag
if (!shape || (shape == "none")) {
    ondrag = undefined;
    //return; //return current;
}
else {
    ondrag = draw[shape];
}

function recordOrRemove(element, emitDo) {
    if (element == undefined) {
    //return;
    if (current) {
        element = current;
    }
    else {
        return;
    }
    }
    if (!(element.get("width") ||
        element.get("height") ||
        element.get("r") ||
        element.get("rx") ||
        element.get("ry") || 
        element.get("x2")))
    {
    element.remove();
    //console.log("removing element " + element.tagName);
    return false;
    }
    else if ((parseInt(element.get("width")) < 1) ||
        (parseInt(element.get("height")) < 1) ||
        (parseInt(element.get("r")) < 1) ||
        (parseInt(element.get("rx")) < 1) ||
        (parseInt(element.get("ry")) < 1) || 
        ( (parseInt(element.get("x2")) == parseInt(element.get("x1"))) && 
        (parseInt(element.get("y2")) == parseInt(element.get("y1")))))
    {
    element.remove();
    //console.log("removing element " + element.tagName);
    return false;
    }
    else {
    //console.log("adding " + element.tagName + " to record");
    recordOfActions.add(element);
    if (emitDo) {
        element.dispatchEvent(new UIEvent("do", { bubbles: true } ));
    }
    return true;
    }
}

function start(tagName) {
    current = createElement(tagName);
    const width = widthSelector.value;
    if (!(width === 0)) { // if width is 0, no stroke
    current.set("stroke", strokeSelector.value);
    }
    if (width) {
    current.set("stroke-width", width);
    }
    if (tagName != "line") {
    current.set("fill", getFill());
    }
    const linecap = linecapFieldset.value;
    if (linecap && (shape == "line")) {
    current.set("stroke-linecap", linecap);
    }
    else if (linecap && (shape == "rect")) {
    current.set("stroke-linejoin", linejoin[linecap]);
    }
    svg.appendChild(current);
    return current;
}

function end() {
    eventListeners.remove("mousemove", ondrag);
    eventListeners.remove("mouseup", end);
    eventListeners.remove("mouseleave", end);
    recordOrRemove(current, true);
    //const wasCurrent = current;
    current = undefined;
    //return wasCurrent;
}

function clickN(e) {
    if (e.shiftKey) {
    ondrag = drawFromCenter[shape];
    }
    else {
    ondrag = draw[shape];
    }
    start(shape);
    eventListeners.set("mousemove", ondrag);
    eventListeners.set("mouseup", end, "once");
    eventListeners.set("mouseleave", end);
}

if (ondrag) {
    eventListeners.set("mousedown", clickN);
}
else {
    eventListeners.removeAll();
    if (current) {
    recordOrRemove(current);
    }
    current = undefined;
}
}

shapeFieldset.addEventListener("change", enableDrawing);

function getPoints(list) {
if (list instanceof Element) {
    list = list.getAttribute("point");
}
const numbers = list.match(/\d+\.?\d*/g).map(parseFloat);
let length = numbers.length;
if ((length % 2) == 1) {
    length = length - 1;
}
let points = new Array(length / 2);
for (let i = 0; i < length; i = i + 2) {
    points[i / 2] = [numbers[i], numbers[i + 1]];
}
return points;
}

widthSelector.addEventListener("change", function setStrokeWidth(e) {
const value = parseFloat(e.target.value);
if (isNaN(value) || Number.isNaN(value)) { 
    e.target.value = "";
    width = undefined;
}
else if (value < 0) {
    width = 0;
}
else {
    width = value;
}
});

class Action {
constructor(element, attribute, from, to, useStyle) {
    this.element = element;
    this.attribute = attribute;
    this.from = from;
    this.to = to;
    this.useStyle = useStyle;
};
toString() {
    const element = this.element;
    const tagName = element.tagName.toLowerCase();
    const style = (this.useStyle) ? "style:" : "";
    let id = element.id;
    id = id ? ("#" + id) : "";
    if (this.attribute[0] == " ") {
    return (`${tagName}${id} ${this.attribute}()`); 
    }
    else {
    return (`${tagName}${id} ${style}${this.attribute} =` +
                `${this.from} -> ${this.to}`
    );
    }
}
}

function setStyle(element, attribute, value) {
if (value === null || value === undefined) {
    element.style.removeProperty(attribute);
}
else if (Array.isArray(attribute)) {
    for (let j = 0; j < attribute.length; j++) {
    setStyle(element, attribute[j], value[j]);
    }
    return;
}
else {
    element.style.setProperty(attribute, value);
}
// ? no code to deal with !important css priority ?
}

function setAttribute(element, attribute, value) {
if (attribute == ".value") {
    element.value = value;
} 
else if (attribute == "checked" && 
    (value === true || value === false)) {
        element.checked = value;
}
else if (value === null || value === undefined) {
    element.removeAttribute(attribute);
}
else if (Array.isArray(attribute)) {
    for (let j = 0; j < attribute.length; j++) {
    setAttribute(element, attribute[j], value[j]);
    }
    return;
}
else {
    element.setAttribute(attribute, value);
}
}

function undo(action) { // argument/parameter only for recursive
if (recordOfActions.length <= 0) {
    // nothing to undo
    return false;
}
//const last = recordOfActions.last;
const last = action ? action : recordOfActions.last;
if (last instanceof Element) {
    last.remove(); // remove last from SVG and DOM
    recordOfActions.pop();
    return true;
}
else if (last instanceof Action) {
    const startsWith = str => {
    return (typeof(last.attribute) == "string") && 
    last.attribute.startsWith(str);
    }
    const element = last.element;
    if (!last.attribute) { 
    console.error("no attribute found for change");
    }
    else if (startsWith(" remove")) {
    // assuming order of elements in svg does not matter
    svg.appendChild(last.element); 
    // ? no code for removed elements that are not direct children of svg ?
    }
    else if ((useInlineStyle || last.useStyle)&& !(last.useStyle === false)) {
    setStyle(element, last.attribute, last.from);
    }
    else {
    setAttribute(element, last.attribute, last.from);
    }
    if (!action) {
    recordOfActions.pop();
    }
    return true;
}
else if (Array.isArray(last)) {
    for(let i = last.length - 1; i >= 0; i--) {
    undo(last[i]);
    }
    recordOfActions.pop();
    return true;
}
}

function redo(action) { // use argument/parameter only for recursive
const length = recordOfActions.length;
if (length >= recordOfActions.list.length) {
    // there are no actions to redo
    return false;
}
//const undone = recordOfActions.at(length);
const undone = action ? action : recordOfActions.at(length);

if ((undone instanceof Element) && (undone != svg)) {
    // assuming order of elements in svg does not matter
    svg.appendChild(undone); // add undone
    recordOfActions.length++;
    return true;
}
else if (undone instanceof Action) {
    const startsWith = str => {
    return (typeof(undone.attribute) == "string") && 
    undone.attribute.startsWith(str);
    }
    const element = undone.element;
    if (!undone.attribute) { 
    console.error("no attribute found for change");
    }
    else if (startsWith(" remove")) {
    undone.element.remove(); // remove from svg 
    // ? no code for undone elements that are not direct children of svg ?
    }
    else if ((useInlineStyle || undone.useStyle) 
            && !(undone.useStyle === false)) {
    setStyle(element, undone.attribute, undone.to);
    }
    else {
    setAttribute(element, undone.attribute, undone.to);
    }
    if (!action) {
    recordOfActions.length++;
    }
    return true;
}
else if (Array.isArray(undone)) {
    for(let action of undone) {
    redo(action);
    }
    recordOfActions.length++;
    return true;
}
}

function updateUndoButtons() {
/* disable undo button if no elements/actions in record of previous,
        otherwise, enable button */
const undoBtn = document.getElementById("undo");
undoBtn.disabled = (recordOfActions.length <= 0);
/* disable redo button if no additional elements/actions in list, 
        otherwise, enable button*/
const redoBtn = document.getElementById("redo");
redoBtn.disabled = (recordOfActions.length >= recordOfActions.list.length);
codeBox.classList.add("invisible");
}
function onUndo(e) { undo(); updateUndoButtons(); };
function onRedo(e) { redo(); updateUndoButtons(); };

document.getElementById("undo").addEventListener("click", onUndo);
document.getElementById("redo").addEventListener("click", onRedo);
svg.addEventListener("do", updateUndoButtons);
svg.addEventListener("undo", updateUndoButtons);
svg.addEventListener("redo", updateUndoButtons);


backgroundCheckbox.addEventListener("change", function onchange(e) {
let action;
let second;
if (!backgroundCheckbox.checked) { 
    // remove background color
    let from = svg.style.backgroundColor;
    //console.log("from=" + from);
    svg.style.removeProperty("background-color");
    if (svg.getAttribute("style") === "") {
    svg.removeAttribute("style");
    }
    action = new Action(svg, "background-color", from, null, true);
    second = new Action(backgroundCheckbox, "checked", true, false, false);
}
else {
    // redo background color
    let newColor = backgroundSelector.value;
    svg.style.backgroundColor = newColor;
    action = new Action(svg, "background-color", null, newColor, true);
    second = new Action(backgroundCheckbox, "checked", false, true, false);
}
recordOfActions.push([action, second]);
svg.dispatchEvent(new UIEvent("do", { bubbles: true } ));
});

backgroundSelector.addEventListener("change", function onchange(e) {
//console.log("changing " + e.target.value);

if (backgroundCheckbox.checked) {
    
    const from = svg.style.backgroundColor;
    const to = e.target.value;
    svg.style.backgroundColor = to;
    //console.log(`${from} -> ${to}`);
    const action = new Action(svg, "background-color", from, to, true);
    const priorAction = e.prior;
    if (priorAction) {
    recordOfActions.push([priorAction, action]);
    }
    else {
    recordOfActions.push(action);
    }
    svg.dispatchEvent(new UIEvent("do", { bubbles: true } ));
}

});

backgroundBtn.addEventListener("click", function onClick(e) {
const from = backgroundSelector.value;
const to = fillSelector.value;
const priorAction = new Action(backgroundSelector, ".value", from, to); 
console.log(`from=${from}, to=${to}`);
if (!(to == from)) {
    const changeEvent = new UIEvent("change");
    changeEvent.prior = priorAction;
    backgroundSelector.value = to;
    backgroundSelector.dispatchEvent(changeEvent);
}
});
//*/





const nf = x => (x === "") ? 0 : x;
const np = x => isNaN(x) ? 0 : parseFloat(x);
const pf = x => {
x = parseFloat(x);
return (Number.isNaN(x)) ? 0 : x;
};

const moveShape = {
by: function translate(element, attribute, amount, useStyle) {
    const newValue = np(element.get(attribute)) + amount;
    //element.set(attribute, newValue);
    if (useStyle === true) {
    element.style.setProperty(attribute, newValue);
    }
    else if (useStyle === false) {
    element.setAttribute(attribute, newValue);
    }
    else {
    element.set(attribute, newValue);
    }
},
line: function moveLine(element, x, y) {
    moveShape.by(element, "x1", x, false);
    moveShape.by(element, "y1", y, false);
    moveShape.by(element, "x2", x, false);
    moveShape.by(element, "y2", y, false);
},
rect: function moveRect(element, x, y) {
    moveShape.by(element, "x", x);
    moveShape.by(element, "y", y);
},
circle: function moveCircle(element, x, y) {
    moveShape.by(element, "cx", x);
    moveShape.by(element, "cy", y);
},
ellipse: function moveEllipse(element, x, y) {
    moveShape.by(element, "cx", x);
    moveShape.by(element, "cy", y);
}
};

const attributeDict = {
line: ["x1", "y1", "x2", "y2"],
rect: ["x", "y"],
circle: ["cx", "cy"],
ellipse: ["cx", "cy"]
};

function enableDrag() {
let shape;
let ondrag;
let attributeChanges = [];
let startX, startY;
let endX, endY;

function recordAction(element, changes, emitDo) { 
    /* changes is array of objects 
        that have properties: attribute, from, to
    */
    let action;
    if (!changes || changes.length == 0) {
    return false;
    }
    else if (changes.length == 1) {
    const changeFrom = changes[0].from;
    const changeTo = changes[0].to;
    if (changeFrom != changeTo) {
        action = new Action(element, 
                attribute, changeFrom, changeTo, useInlineStyle);
    }
    else {
        return false;
    }
    }
    else {
    const actual = changes.filter(p => (p.from != p.to));
    if (actual.length < 1) { return false; }
    action = new Action(element,
                            actual.map(p => p.attribute),
                            actual.map(p => p.from),
                            actual.map(p => p.to),
                            useInlineStyle
    );
    }
    recordOfActions.add(action);
    if (emitDo) {
    element.dispatchEvent(new UIEvent("do", { bubbles: true } ));
    }
    return true;
}

function drop(event) {
    //target.dispatchEvent(new DragEvent("dragend", event));
    current.removeEventListener("mousemove", ondrag);
    eventListeners.remove("mousemove", ondrag);
    eventListeners.remove("mouseup", drop);
    eventListeners.remove("mouseleave", drop);
    /*
    if (event) {
    endX = event.offSetX; //clientX?
    endY = event.offSetY; //clientY?
    }
    */
    if (!((endX == startX) && (endY == startY))) { 
    for (let change of attributeChanges) {
        change.to = current.get(change.attribute);
    }
    recordAction(current, attributeChanges, true);
    
    }
    //const wasCurrent = current;
    current = undefined;
    attributeChanges = [];
    //return wasCurrent;
}

function startDrag(event) {  
    // event.currentTarget is svg
    //target.dispatchEvent(new DragEvent("dragstart", event));
    startX = event.offSetX; // clientX?
    startY = event.offSetY; // clientY?
    endX = startX;
    endY = startY;
    current = event.target;
    shape = current.tagName.toLowerCase();
    if (moveShape[shape]) {
    ondrag = e => { 
        //target.dispatchEvent(new DragEvent("drag", event));
        if (shape == current.tagName.toLowerCase()) {
        endX += e.movementX;
        endY += e.movementY;
        moveShape[shape](current, e.movementX, e.movementY);
        }
    }
    eventListeners.set("mousemove", ondrag);
    //element.addEventListener("mousemove", ondrag);
    eventListeners.set("mouseup", drop, 
        { bubbles: true, once: true}
    );
    eventListeners.set("mouseleave", drop, "bubbles");
    if (attributeDict[shape]) {
        attributeDict[shape].forEach(attribute => {
        attributeChanges.push({attribute, from: current.get(attribute)});
        });
    }
    }
}

eventListeners.set("mousedown", startDrag);

/*
    element.removeEventListener("mousemove", ondrag);
    eventListeners.remove("mousemove", ondrag);
    eventListeners.remove("mouseup", drop);
    eventListeners.remove("mouseleave", drop);
    //if (current) { drop(); };
    current = undefined;
*/
}

function moveToEnd(element) {  // set element to be last in svg
if (element instanceof Event) {
    element = event.target;
}
if (element != svg && svg.contains(element)) {
    svg.appendChild(element);
}
}

function deleteElement(element, emitDo) {
if ((element == undefined) || (element == svg)) {
    element = current;
}
if (element instanceof Event) {
    element = element.target;
}
if (!svg.contains(element) && current) {
    element = current;
}
if (element) {
    if (element == svg) { return; };
    element.remove();
    recordOfActions.add(new Action(element, " remove"));
    if (emitDo) {
    element.dispatchEvent(new UIEvent("do", { bubbles: true } ));
    }
}
}

const actionSet = document.getElementById("action");
actionSet.addEventListener("change", function onChange() {
const value = actionSet.value;
linecapFieldset.style.display = "none";
linecapFieldset.querySelector("input[value='']").checked = true;

function disableDraw(selected) {
    const noneBox = shapeFieldset.querySelector("#none");
    noneBox.checked = true;
    noneBox.dispatchEvent(new Event("change"));
    shapeFieldset.disabled = true;
    colorFieldset.disabled = true;
    widthSelector.disabled = true;
    eventListeners.removeAll();
}
function removeListeners() {
    eventListeners.removeAll();
}

if (value == "draw") {
    shapeFieldset.disabled = false;
    colorFieldset.disabled = false;
    widthSelector.disabled = false;
    const noneBox = shapeFieldset.querySelector("#none");
    noneBox.checked = true;
    noneBox.click();
    noneBox.dispatchEvent(new Event("change"));
    removeListeners();
} 
else if (value == "move") {
    disableDraw(value);
    enableDrag();
    eventListeners.set("dblclick", moveToEnd);
}
else if (value == "delete") {
    disableDraw();
    eventListeners.set("click", deleteElement);
}
} );

const resizeBtn = document.getElementById("resizeBtn");
const svgContainer = document.getElementById("svg-container");
function resizeSVG() {
const style = window.getComputedStyle(svgContainer);
let {width, height} = style;
width = pf(width);
height = pf(height);
let oldValues = [
    pf(svg.getAttribute("width")), 
    pf(svg.getAttribute("height")),
    svg.getAttribute("viewBox")
];
svg.setAttribute("width", width);
svg.setAttribute("height", height);
const viewBox = `0 0 ${width - 1} ${height - 1}`;
svg.setAttribute("viewBox", viewBox);

let newValues = [width, height, viewBox];
let attr = ["width", "height", "viewBox"];
let areSame = true;
for (let i = 0; i < 2; i++) {
    areSame = areSame && (newValues[i] == oldValues[i]);
}
if (!areSame) {
    const action = new Action(svg, attr, oldValues, newValues, false);
    recordOfActions.add(action);
    svg.dispatchEvent(new UIEvent("do"));
}
}

resizeBtn.addEventListener("click", resizeSVG);



async function asImgType(url, fileName, anchor) {
console.log(fileName);
const extension = fileName.match(/\.[a-z]+$/)[0].substring(1);
console.log(extension);
let imgUrl;
const width = parseInt(svg.getAttribute("width"));
const height = parseInt(svg.getAttribute("height"));
const img = document.createElement("img");
img.width = width;
img.height = height;
img.src = url;
img.ondblclick = img.remove;

const canvas = document.createElement("canvas");
canvas.width = width; //img.naturalWidth;
canvas.height = height; //img.naturalHeight;
canvas.ondblclick = canvas.remove;
const context = canvas.getContext("2d");

img.decode().then((resolve, reject) => {
    context.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    let imageQuality = undefined; // 0 to 1
    imgUrl = canvas.toDataURL("img/" + extension, imageQuality);
    const a = document.createElement("a");
    a.type = "img/" + extension;
    a.href = imgUrl;
    a.removeAttribute("target");
    a.download = fileName;
    a.click();
    }
);
return imgUrl;
}

const downloader = document.getElementById("downloader");

downloader.onclick = function updateLink(event) {
const anchor = downloader;
const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" } );
//anchor.type = "image/svg+xml";
URL.revokeObjectURL(anchor.href);
let url = URL.createObjectURL(blob);
let filename = anchor.parentElement.querySelector(".filename").value;
if (!filename || event.shiftKey) {
    anchor.removeAttribute("download");
    anchor.target = "_blank";
}
else {
    const supportedTypes = ["png", "jpeg", "webp"];
    console.log(filename.endsWith("png"));
    if (supportedTypes.some(
    type => filename.endsWith("." + type))) {
        url = asImgType(url, filename, anchor);
    }
    else if (!filename.includes(".")) {
    filename = filename + ".svg";
    }
    anchor.removeAttribute("target");
    anchor.download = filename;
}
if (url instanceof Promise) {
    event.preventDefault();
    url.then(string => anchor.href = string);
}
else {
    anchor.href = url;
}
}



let dragged = null;
function setDragged(event) { dragged = event.target; }
const colorSelectors = [strokeSelector, fillSelector, backgroundSelector];

for (let element of colorSelectors) {
element.draggable = true;
element.ondragstart = setDragged;
element.ondragover = function allowDrop(event) {
    const target = event.target;
    if (dragged.type && dragged.type == "color") {
    event.preventDefault();
    return true;
    }
};
element.ondrop = function changeValue(event) {
    const target = event.target;
    if (dragged.type && dragged.type == "color") {
    event.preventDefault();
    const oldValue = target.value;
    target.value = dragged.value;
    if (oldValue != dragged.value) {
        const change = new UIEvent("change");
        change.prior = new Action(target, ".value", oldValue, dragged.value);
        target.dispatchEvent(change);
    }
    }
};
}

const toCanvasBtn = document.getElementById("toCanvasBtn");
toCanvasBtn.onclick = function addCanvas(event) {
const canvas = document.createElement("canvas");
const width = parseInt(svg.getAttribute("width"));
const height = parseInt(svg.getAttribute("height"));
const context = canvas.getContext("2d");
const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" } );
const url = URL.createObjectURL(blob);
const img = document.createElement("img");
img.width = width;
img.height = height;
img.src = url;
img.ondblclick = img.remove;
img.classList.add("snapshot");

canvas.width = width; //img.naturalWidth;
canvas.height = height; //img.naturalHeight;
canvas.ondblclick = canvas.remove;
canvas.classList.add("snapshot");

img.decode().then((resolve, reject) => {
    context.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    }
);

toCanvasBtn.insertAdjacentElement("afterend", canvas);
}

function clearSnapshots(event) {
const snapshots = Array.from(document.getElementsByClassName("snapshot"));
snapshots.forEach(element => element.remove());
}

document.addEventListener("do", clearSnapshots);
document.addEventListener("undo", clearSnapshots);