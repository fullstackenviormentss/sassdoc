var regex = require('./regex');
var utils = require('./utils');

exports = module.exports = {

  /**
   * Define a block of comments
   * @param  {Number} index - index of line where function/mixin starts
   * @param  {Array}  array - file as an array of lines
   * @return {Array}          array of lines
   */
  findCommentBlock: function (index, array) {
    var previousLine = index - 1,
        comments = [];

    // Loop back
    while (previousLine--) {
      // If it's an empty line, break (unless it hasn't started yet)
      if (comments.length > 0 && regex.isEmpty(array[previousLine])) {
        break;
      } 

      // If it's not a comment, break
      if (!regex.isComment(array[previousLine])) {
        break;
      }

      // Push the new comment line
      comments.unshift(array[previousLine]);
    }

    return comments;
  },

  /**
   * Parse a block of comments
   * @param  {Array} comments - array of lines
   * @return {Object}           function/mixin documentation
   */
  parseCommentBlock: function (comments) {
    var line, doc = {
      'parameters': [],
      'throws': [],
      'todos': [],
      'alias': [],
      'link': [],
      'description': '',
      'access': 'public',
      'deprecated': false,
      'author': false,
      'return': {
        'type': null,
        'description': false
      }
    };

    comments.forEach(function (line, index) {
      line = exports.parseLine(utils.uncomment(line));

      // Separator or @ignore
      if (!line) {
        return false;
      }

      // Array things (@throws, @parameters...)
      if (line.array === true) {
        doc[line.is].push(line.value);
      }

      else if (line.is === "description") {
        doc[line.is] += line.value;
      }

      // Anything else
      else {
        doc[line.is] = line.value;
      }

    });

    // Remove first carriage return
    doc.description = doc.description.substring(1);

    return doc;
  },

  /**
   * Parse a file
   * @param  {String} content - file content
   * @return {Array}            array of documented functions/mixins
   */
  parseFile: function (content) {
    var array = content.split("\n"),
        tree = [];

    // Looping through the file
    array.forEach(function (line, index) {
      var isCallable = regex.isFunctionOrMixin(line);

      // If it's either a mixin or a function
      if (isCallable) {
        var item = exports.parseCommentBlock(exports.findCommentBlock(index, array));
        item.type = isCallable[1];
        item.name = isCallable[2];

        tree.push(item);
      }
    });

    return tree;
  },

  /**
   * Parse a line to determine what it is
   * @param  {String} line  - line to be parsed
   * @return {Object|false}
   */
  parseLine: function (line) {
    var value;

    // Useless line, skip
    if (line.length === 0 || regex.isSeparator(line) || regex.isIgnore(line)) {
      return false;
    }

    value = regex.isReturns(line);
    if (value) {
      return {
        'is': 'return',
        'value': {
          'type': value[1].split('|'),
          'description': value[2]
        }
      };
    }

    value = regex.isParam(line);
    if (value) {
      return {
        'is': 'parameters',
        'value': {
          'type': value[1],
          'name': value[2],
          'default': value[3] || null,
          'description': value[4]
        },
        'array': true
      };
    }

    value = regex.isDeprecated(line);
    if (value) {
      return {
        'is': 'deprecated',
        'value': value[1] || true
      };
    }

    value = regex.isAuthor(line);
    if (value) {
      return {
        'is': 'author',
        'value': value[1]
      };
    }

    value = regex.isAccess(line);
    if (value) {
      return {
        'is': 'access',
        'value': value[1]
      };
    }

    value = regex.isThrows(line);
    if (value) {
      return {
        'is': 'throws',
        'value': value[1],
        'array': true
      };
    }

    value = regex.isTodo(line);
    if (value) {
      return {
        'is': 'todos',
        'value': value[1],
        'array': true
      };
    }

    value = regex.isAlias(line);
    if (value) {
      return {
        'is': 'alias',
        'value': value[1],
        'array': true
      };
    }

    value = regex.isLink(line);
    if (value) {
      return {
        'is': 'link',
        'value': {
          'url': value[1],
          'caption': value[2]
        },
        'array': true
      };
    }

    return {
      'is': 'description',
      'value': '\n' + line
    };
  }

};
