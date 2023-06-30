'use strict';
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const $create = document.createElement.bind(document);
const $createcomment = document.createComment.bind(document);
const $createtext = document.createTextNode.bind(document);
const root = document.querySelector(':root');
const setprop = root.style.setProperty.bind(root.style);
const proproot = getComputedStyle(root);
const getprop = proproot.getPropertyValue.bind(proproot);
const editor = $('#textarea');
const style = $('style');
const capcheck = $('#capcheck');
const cover = $('#cover');
const turnoffcover_ = { span: $$('#turnoffcover span'), check: true };
const turnonnotes_ = { span: $$('#turnonnotes span'), check: true };
const sliderdiv = $('#slidecontainer');
const sliderpan = $$('#slidecontainer span');
const slider = $('#myRange');
const rem = parseInt(getComputedStyle(document.documentElement).fontSize);
let prevstrings = '';
let numrow;

if (!String.prototype.splice) {
    /**
     * {JSDoc}
     *
     * The splice() method changes the content of a string by removing a range of
     * characters and/or adding new characters.
     *
     * @this {String}
     * @param {number} start Index at which to start changing the string.
     * @param {number} delCount An integer indicating the number of old chars to remove.
     * @param {string} newSubStr The String that is spliced in.
     * @return {string} A new string with the spliced substring.
     */
    String.prototype.splice = function (start, delCount, newSubStr) {
        return (
            this.slice(0, start) +
            newSubStr +
            this.slice(start + Math.abs(delCount))
        );
    };
}

window.onload = function () {
    for (let i = 0; i < editor.childNodes.length; i++) {
        editor.childNodes[i].textContent = editor.childNodes[i].textContent
            .trim()
            .replace(/\s+/g, ' ');
    }
    inputevent();
};
window.onresize = calculatecover;
slider.oninput = function () {
    let vl = +this.value;
    setprop('--txtarea_fontsz', `${vl}`);
    calculatecover();
    for (let i = 0; i < editor.childNodes.length; i++) {
        editor.childNodes[i].textContent = editor.childNodes[i].textContent
            .trim()
            .replace(/\s+/g, ' ');
    }
    inputevent();
    vl -= 3;
    for (let i = 0; i < sliderpan.length; i++) {
        sliderpan[i].className = i == vl ? 'cap' : '';
    }
};

editor.addEventListener('input', inputevent, false);
document.addEventListener('keydown', testCapsLock);
document.addEventListener('keyup', testCapsLock);

// get the cursor position from .editor start
function getCursorPosition(parent, node, offset, stat) {
    if (stat.done) return stat;

    let currentNode = null;
    if (parent.childNodes.length == 0) {
        stat.pos += parent.textContent.length;
    } else {
        for (let i = 0; i < parent.childNodes.length && !stat.done; i++) {
            currentNode = parent.childNodes[i];
            if (currentNode === node) {
                stat.pos += offset;
                stat.done = true;
                return stat;
            } else getCursorPosition(currentNode, node, offset, stat);
        }
    }
    return stat;
}

//find the child node and relative position and set it on range
function setCursorPosition(parent, range, stat) {
    if (stat.done) return range;

    if (parent.childNodes.length == 0) {
        if (parent.textContent.length >= stat.pos) {
            range.setStart(parent, stat.pos);
            stat.done = true;
        } else {
            stat.pos = stat.pos - parent.textContent.length;
        }
    } else {
        for (let i = 0; i < parent.childNodes.length && !stat.done; i++) {
            let currentNode = parent.childNodes[i];
            setCursorPosition(currentNode, range, stat);
        }
    }
    return range;
}

function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

async function inputevent() {
    const sel = window.getSelection();
    const node = sel.focusNode;
    const offset = sel.focusOffset;
    const pos = getCursorPosition(editor, node, offset, {
        pos: 0,
        done: false,
    });
    if (offset === 0) pos.pos += 0.5;
    // save the position

    let prevstrings_ = '';
    let arr = [];
    let count = 0;
    let child = editor.childNodes;
    let frag = document.createDocumentFragment();

    // calculate prevstrings
    let prevstrings_offset =
        editor.textContent.trim().length - prevstrings.length;
    let insertstring = '';
    for (let i = 0; i < prevstrings_offset; i++) {
        insertstring += 'x';
    }

    prevstrings = prevstrings.splice(
        Math.floor(pos.pos) - (prevstrings_offset < 0 ? 0 : prevstrings_offset),
        prevstrings_offset < 0 ? -prevstrings_offset : 0,
        insertstring
    );

    // construct
    for (let i = 0; i < child.length; i++) {
        let string = child[i].textContent;
        if (child[i].nodeType == 3 || child[i].tagName == 'SPAN') {
            construct(string, frag);
        } else if (child[i].nodeType == 1) {
            let div = $create('div');
            if (string.length > 0 && string != ' ') {
                construct(string, div);
            } else {
                div.append($create('br'));
                div.append($createtext(' '));
                count++;
                prevstrings_ += ' ';
            }
            frag.append(div);
        }
    }
    editor.innerHTML = '';
    editor.prepend(frag);

    // restore the position
    sel.removeAllRanges();
    const range = setCursorPosition(editor, document.createRange(), {
        pos: pos.pos,
        done: false,
    });
    range.collapse(true);
    sel.addRange(range);
    //
    calculatecover();
    //
    await wait(100);
    for (let i = 0; i < arr.length; i++) {
        arr[i].classList.add('cap');
    }
    prevstrings = prevstrings_.trim();

    // inner func
    function construct(string, bip) {
        let text = '';
        for (let a = 0; a < string.length; a++) {
            let char = string[a];
            if (char === char.toUpperCase() && char !== char.toLowerCase()) {
                let span = $create('span');
                span.innerHTML = char;
                bip.append($createtext(text), span);
                text = '';
                if (char != prevstrings[count]) {
                    arr.push(span);
                } else {
                    span.classList.add('cap');
                }
            } else {
                text += char;
            }
            count++;
            prevstrings_ += char;
        }
        if (text != '') {
            bip.append($createtext(text));
        }
    }
}

function calculatecover() {
    numrow = Math.floor(
        (editor.offsetHeight - 20) / (+getprop('--txtarea_fontsz') * rem)
    );
    style.textContent = `
        #cover :nth-child(n + ${numrow + 1}) {
            display: none;
        }
        `;
    setprop('--rownum', `${numrow}`);
}

function testCapsLock(event) {
    if (event.code === 'CapsLock') {
        capcheck.classList.add('ready');
        capcheck.classList[
            event.getModifierState('CapsLock') ? 'add' : 'remove'
        ]('on');
    } else if (event.key === 'Shift') {
        capcheck.classList.add('ready');
        capcheck.classList[event.type == 'keydown' ? 'add' : 'remove']('on');
    }
}

function turnoffcover(a) {
    cover.classList.toggle('off');
    a.classList.toggle('off');
    togglebutton(turnoffcover_);
}

function turnonnotes(a) {
    a.classList.toggle('off');
    document.body.classList.toggle('shownotes');
    togglebutton(turnonnotes_);
}

function togglebutton(button) {
    if (button.check) {
        for (let i = 0; i < button.span.length; i++) {
            button.span[i].classList[Math.random() > 0.5 ? 'add' : 'remove'](
                'cap'
            );
        }
    }
    button.check = !button.check;
}
