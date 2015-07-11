define(['TParser', 'ui/TLog', 'TEnvironment', 'utils/TUtils', 'TRuntime', 'jquery', 'ace/ace', 'ace/autocomplete', 'ace/range'], function (TParser, TLog, TEnvironment, TUtils, TRuntime, $, ace, ace_autocomplete, ace_range) {

    function TLearnEditor(callback) {
		var $editor, $editorText;

        TComponent.call(this, "TLearnEditor.html", function(component) {
	        $editor = component;
	        $editorText = component.find("#tlearneditor-text");
	        if (typeof callback !== 'undefined') {
		        callback.call(this, component);
	        }
        });

        var AceRange = ace_range.Range;
        var AceAutocomplete = ace_autocomplete.Autocomplete;

        var aceEditor;
        var computedHeight = -1;

        var popupTriggered = false;
        var popupTimeout;
        var triggerPopup = false;

        this.displayed = function () {
            aceEditor = ace.edit($editorText.attr("id"));
            aceEditor.getSession().setMode("ace/mode/javascript");
            // Disable JSHint
            aceEditor.getSession().setUseWorker(false);
            aceEditor.setShowPrintMargin(false);
            aceEditor.renderer.setShowGutter(true);
            aceEditor.setFontSize("20px");
            aceEditor.setHighlightActiveLine(false);
            aceEditor.setTheme("ace/theme/twilight");
            aceEditor.on('input', function () {
                if (triggerPopup) {
                    triggerPopup = false;
                    popupTimeout = setTimeout(function () {
                        popupTriggered = false;
                        // Force Ace popup to not add gutter width when computing popup pos
                        // since gutter is not shown
                        aceEditor.renderer.$gutterLayer.gutterWidth = 0;
                        AceAutocomplete.startCommand.exec(aceEditor);
                    }, 800);
                    popupTriggered = true;
                } else if (popupTriggered) {
                    clearTimeout(popupTimeout);
                    popupTriggered = false;
                }
            });

            aceEditor.completers = [consoleCompleter];

            //this.enableMethodHelper();

        };

        this.getValue = function () {
            var simpleText = aceEditor.getSession().getValue();
            var protectedText = TUtils.addQuoteDelimiters(simpleText);
            var command = TUtils.parseQuotes(protectedText);
            return command;
        };

        this.setValue = function (value) {
            aceEditor.getSession().setValue(value);
            // set cursor to the end of line
            aceEditor.gotoPageDown();
        };

        this.focus = function () {
            aceEditor.focus();
        };

        this.getStatements = function () {
            return TParser.parse(this.getValue());
        };

        this.clear = function () {
            aceEditor.setValue("");
        };

        this.show = function () {
            $editor.show();
            aceEditor.focus();
        };

        this.hide = function () {
            $editor.hide();
        };

        this.getHeight = function () {
            if (computedHeight === -1) {
                computedHeight = $editor.outerHeight(false);
            }
            return computedHeight;
        };

        this.enableMethodHelper = function () {
            aceEditor.commands.addCommand(dotCommand);
            aceEditor.commands.addCommand(backspaceCommand);
            aceEditor.commands.addCommand(AceAutocomplete.startCommand);
        };

        this.disableMethodHelper = function () {
            aceEditor.commands.removeCommand(dotCommand);
            aceEditor.commands.removeCommand(backspaceCommand);
            aceEditor.commands.removeCommand(AceAutocomplete.startCommand);
        };

        var consoleCompleter = {
            getCompletions: function (editor, session, pos, prefix, callback) {
                pos.column--;
                var token = session.getTokenAt(pos.row, pos.column);

                if (token === null) {
                    return false;
                }

                var tokens = session.getTokens(pos.row);
                var index = token.index;

                // TODO: see if we can handle this situation in js
                /*if (token.type === "rparen") {
                 // Right parenthesis: try to find actual identifier
                 while (index >0 & token.type !== "identifier") {
                 index--;
                 token = tokens[index];
                 }
                 endToken = "[";
                 }*/

                if (token.type !== "identifier" && token.type !== "text" && token.type !== "keyword" && token.type !== "string") {
                    return false;
                }

                var name = token.value.trim();

                for (var i = index - 1; i >= 0; i--) {
                    token = tokens[i];
                    if (token.type !== "identifier" && token.type !== "text") {
                        break;
                    }
                    var part = token.value.trim();
                    if (part.length === 0) {
                        break;
                    }

                    name = part + name;
                }

                if (name.length === 0) {
                    return false;
                }

                var className = TRuntime.getTObjectClassName(name);
                var methods = TEnvironment.getClassMethods(className);
                var methodNames = Object.keys(methods);
                methodNames = TUtils.sortArray(methodNames);

                var completions = [];
                for (var j = 0; j < methodNames.length; j++) {
                    completions.push({
                        caption: methodNames[j],
                        value: methods[methodNames[j]]
                    });
                }
                callback(null, completions);
            }
        };

        var dotCommand = {
            name: "methodHelper",
            bindKey: {win: '.', mac: '.'},
            exec: function (editor) {
                triggerPopup = true;
                return false; // let default event perform
            },
            readOnly: true // false if this command should not apply in readOnly mode
        };

        var backspaceCommand = {
            name: "methodHelper2",
            bindKey: {win: 'Backspace', mac: 'Backspace'},
            exec: function (editor) {
                var cursor = editor.selection.getCursor();
                var token = editor.getSession().getTokenAt(cursor.row, cursor.column - 1);
                if (token !== null && token.type === "punctuation.operator" && token.value === ".") {
                    triggerPopup = true;
                }
                return false;
            },
            readOnly: true // false if this command should not apply in readOnly mode
        };
//        var classCommand = {
//            name: "classHelper",
//            bindKey: {win: 'Space', mac: 'Space'},
//            exec: function (editor) {
//                var cursor = editor.selection.getCursor();
//                var token = editor.getSession().getTokenAt(cursor.row, cursor.column - 1);
//
//                if (token !== null && token.type === "keyword" && token.value === "new") {
//                    triggerPopup = true;
//                }
//                return false;
//            },
//            readOnly: true // false if this command should not apply in readOnly mode
//        };
    }
    
    TLearnEditor.prototype = Object.create(TComponent.prototype);
    TLearnEditor.prototype.constructor = TLearnEditor;    
    

    return TLearnEditor;
});
