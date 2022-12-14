/*
This code was ported from Python to Javascript based on reference code from:
https://github.com/pytries/DAWG-Python/

The original code was licensed under MIT license:

    Copyright (c) Mikhail Korobov, 2012

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is furnished
    to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR
    A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
    CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
import * as units from './units.js';

/**
 * Dictionary class for retrieval and binary I/O.
 */
export class Dictionary {
    constructor() {
        this._units = null;
        this.ROOT = 0;
    }

    /**
     * Checks if a given index is related to the end of a key.
     */
    has_value(index) {
        return units.has_leaf(this._units[index]);
    }
    
    /**
     * Gets a value from a given index.
     */
    value(index) {
        const offset = units.offset(this._units[index]);
        const value_index = (index ^ offset) & units.PRECISION_MASK;
        return units.value(this._units[value_index]);
    }

    /**
     * Reads a dictionary from an input stream.
     */
    read(raw_buffer) {
        let view = new DataView(raw_buffer);
        let base_size = view.getUint32(0, true);
        this._units = new Uint32Array(raw_buffer, 4, base_size);
    }

    /**
     * Exact matching.
     */
    contains(key) {
        const index = this.follow_bytes(key, this.ROOT);
        if (index === null) {
            return false;
        }
        return this.has_value(index);
    }

    /**
     * Exact matching (returns value)
     */
    find(key) {
        const index = this.follow_bytes(key, this.ROOT);
        if (index === null) {
            return -1;
        }
        if (!this.has_value(index)) {
            return -1;
        }
        return this.value(index);
    }

    /**
     * Follows a transition
     */
    follow_char(label, index) {
        const offset = units.offset(this._units[index]);
        const next_index = (index ^ offset ^ label) & units.PRECISION_MASK;

        if (units.label(this._units[next_index]) != label) {
            return null;
        }

        return next_index;
    }

    /**
     * Follows transitions.
     */
    follow_bytes(s, index) {
        for (let ch of s) {
            index = this.follow_char(ch, index)
            if (index === null) {
                return null;
            }
        }

        return index;
    }
}

export class Guide {

    
    constructor() {
        this._units = null;
        this.ROOT = 0;
    }

    child(index) {
        return this._units[index*2];
    }

    sibling(index) {
        return this._units[index*2 + 1];
    }

    read(raw_buffer) {
        let view = new DataView(raw_buffer);
        let dict_size = view.getUint32(0, true);
        let guide_offset = 4 + (dict_size * 4);
        let base_size = view.getUint32(guide_offset, true);
        this._units = new Uint8Array(raw_buffer, guide_offset + 4, base_size * 2);
    }

    size() {
        return this._units.length;
    }
}

export class Completer {

    constructor(dic=null, guide=null) {
        this._dic = dic
        this._guide = guide
    }

    value() {
        return this._dic.value(this._last_index)
    }

    start(index, prefix="") {
        this.key = [...prefix];

        if (this._guide.size()) {
            this._index_stack = [index];
            this._last_index = this._dic.ROOT;
        }
        else {
            this._index_stack = [];
        }
    }

    /**
     * Gets the next key
     */
    next() {

        if (this._index_stack.length === 0) {
            return false;
        }

        let index = this._index_stack[this._index_stack.length - 1];

        if (this._last_index != this._dic.ROOT) {

            const child_label = this._guide.child(index);

            if (child_label) {
                // Follows a transition to the first child.
                index = this._follow(child_label, index);
                if (index === null) {
                    return false;
                }
            }
            else {
                while (true) {
                    let sibling_label = this._guide.sibling(index);
                    // Moves to the previous node.
                    if (this.key.length > 0) {
                        this.key.pop();
                    }

                    this._index_stack.pop();
                    if (this._index_stack.length === 0) {
                        return false;
                    }

                    index = this._index_stack[this._index_stack.length - 1];
                    if (sibling_label) {
                        // Follows a transition to the next sibling.
                        index = this._follow(sibling_label, index);
                        if (index === null) {
                            return false;
                        }
                        break;
                    }
                }
            }
        }

        return this._find_terminal(index);
    }

    _follow(label, index) {
        const next_index = this._dic.follow_char(label, index);
        if (next_index === null) {
            return null;
        }

        this.key.push(label);
        this._index_stack.push(next_index);
        return next_index;
    }

    _find_terminal(index) {
        while (!this._dic.has_value(index)) {
            let label = this._guide.child(index);

            index = this._dic.follow_char(label, index);
            if (index === null) {
                return false;
            }

            this.key.push(label);
            this._index_stack.push(index);
        }

        this._last_index = index;
        return true;
    }
}