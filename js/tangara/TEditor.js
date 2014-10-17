define(['jquery','ace/ace', 'ace/edit_session', 'ace/range', 'ace/undomanager', 'ace/autocomplete', 'TProgram', 'TEnvironment', 'TLink', 'TUI', 'TUtils'], function($,ace, ace_edit_session, ace_range, ace_undo_manager, ace_autocomplete, TProgram, TEnvironment, TLink, TUI, TUtils) {

    function TEditor() {
        var domEditor = document.createElement("div");
        domEditor.id = "teditor";
        var aceEditor;
        var codeChanged = false;
        var program;
        var AceEditSession = ace_edit_session.EditSession;
        var AceUndoManager = ace_undo_manager.UndoManager;
        var AceRange = ace_range.Range;
        var AceAutocomplete = ace_autocomplete.Autocomplete;
        var errorMarker = null;
        var disabled = false;
        var disabledSession = new AceEditSession('');
        var disabledMessage = document.createElement("div");
        disabledMessage.id =  "disabled-message";
        var disabledP = document.createElement("p");
        var disabledText = TEnvironment.getMessage("editor-disabled");
        disabledP.appendChild(document.createTextNode(disabledText));
        disabledMessage.appendChild(disabledP);
        
        var popupTriggered = false;
        var popupTimeout;
        
        
        this.getElement = function() {
            return domEditor;
        };
        
        this.displayed = function() {
            aceEditor = ace.edit(domEditor.id);            
            aceEditor.setShowPrintMargin(false);
            //aceEditor.renderer.setShowGutter(false);
            aceEditor.setFontSize("20px");
            aceEditor.setHighlightActiveLine(false);
            aceEditor.setBehavioursEnabled(false);
            
            var self = this;
            aceEditor.on('input', function() {
                if (!program.isModified()) {
                    program.setModified(true);
                    window.unsavedFiles = true;
                    TUI.updateSidebarPrograms();
                }
                codeChanged = true;
                self.removeError();
            });
            aceEditor.commands.addCommand({
                name: "save",
                bindKey: {win: "Ctrl-S", mac: "Command-S"},
                exec: function(arg) {
                    TUI.saveProgram();
                }
            });
            aceEditor.commands.addCommand({
                name: "methodHelper",
                bindKey: {win: '.',  mac: '.'},
                exec: function(editor) {
                    triggerPopup();
                    return false; // let default event perform
                },
                readOnly: true // false if this command should not apply in readOnly mode
            });
            aceEditor.commands.addCommand({
                name: "methodHelper2",
                bindKey: {win: 'Backspace',  mac: 'Backspace'},
                exec: function(editor) {
                    var cursor = editor.selection.getCursor();
                    var token = editor.getSession().getTokenAt(cursor.row, cursor.column-1);
                    if (token !== null && token.type === "punctuation.operator" && token.value === ".") {
                        triggerPopup();
                    }
                    return false;
                },
                readOnly: true // false if this command should not apply in readOnly mode
            });
            
            aceEditor.commands.addCommand(AceAutocomplete.startCommand);
            
            aceEditor.completers = [tangaraCompleter];
            
            
            // link popup to editor
            //popup.setEditor(aceEditor);
            
            // disable editor, waiting for a program to edit
            this.disable();
        };
        
        triggerPopup = function() {
            popupTimeout = setTimeout(function() { AceAutocomplete.startCommand.exec(aceEditor);}, 1000);
        };
        
        this.show = function() {
            $(domEditor).show();
            aceEditor.focus();
        };
        
        this.hide = function() {
            $(domEditor).hide();
        };
        
        this.getValue = function() {
            return aceEditor.getSession().getValue();
        };
        
        this.getStatements = function() {
            if (codeChanged) {
                program.setCode(this.getValue());
                codeChanged = false;
            }
            return program.getStatements();
        };
        
        this.getProgram = function() {
            return program;
        };

        this.setProgram = function(value) {
            program = value;
            codeChanged = true;
        };

        
        this.getProgramName = function() {
            return program.getName();
        };
        
        this.setSession = function(session) {
             if (disabled) {
                aceEditor.setReadOnly(false);
                aceEditor.renderer.setShowGutter(true);
                $(domEditor).removeClass('editor-disabled');
                domEditor.removeChild(disabledMessage);
                disabled = false;
                TUI.setEditionEnabled(true);                
             }
            aceEditor.setSession(session);
        };
        
        this.getSession = function() {
            return aceEditor.getSession();
        };

        this.reset = function() {
            var undo = aceEditor.getSession().getUndoManager();
            undo.reset();
            codeChanged = false;
        };
        
        this.giveFocus = function() {
            aceEditor.focus();
        };

        this.disable = function() {
            aceEditor.setSession(disabledSession);
            aceEditor.setReadOnly(true);
            aceEditor.renderer.setShowGutter(false);
            $(domEditor).addClass('editor-disabled');
            domEditor.appendChild(disabledMessage);
            TUI.setEditionEnabled(false);
            disabled = true;
        };

        this.removeError = function() {
            if (errorMarker !== null) {
                aceEditor.getSession().removeMarker(errorMarker);
                errorMarker = null;
            }
        };
        
        this.setError = function(lines) {
            this.removeError();
            if (lines.length > 1) {
                var range = new AceRange(lines[0]-1,0,lines[1]-1,100);
                errorMarker = aceEditor.getSession().addMarker(range, 'tangara_error', 'line', true);
            } else if (lines.length > 0) {
                var range = new AceRange(lines[0]-1,0,lines[0]-1,100);
                errorMarker = aceEditor.getSession().addMarker(range, 'tangara_error', 'line', true);
            }
            aceEditor.navigateTo(lines[0]-1, 0);
            // In a timer, because otherwise does not seem to work when editor mode has just been activated
            setTimeout(function() { aceEditor.scrollToLine(lines[0]-1, true, true, null); }, 100);
        };
        
        this.createSession = function(program) {
            var session = new AceEditSession(program.getCode());
            session.setMode("ace/mode/javascript");
            session.setUndoManager(new AceUndoManager());
            // Disable JSHint
            session.setUseWorker(false);
            return session;
        };
        
        toUnicode = function(text){
            var result = "";
            for(var i = 0; i < text.length; i++){
                result += "\\u" + ("000" + text.charCodeAt(i).toString(16)).substr(-4);
            }
            return result;
        };

        var tangaraCompleter = {
            getCompletions: function(editor, session, pos, prefix, callback) {
                pos.column--;
                var token = session.getTokenAt(pos.row, pos.column);
                var endToken = "(";

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

                if (token.type !== "identifier" &&  token.type !== "text") {
                    return false;
                }

                var name = token.value.trim();

                for (var i = index-1;i>=0;i--) {
                    token = tokens[i];
                    if (token.type !== "identifier" &&  token.type !== "text") {
                        break;
                    }
                    var part = token.value.trim();
                    if (part.length === 0) {
                        break;
                    }

                    name = part+name;
                }

                if (name.length === 0) {
                    return false;
                }

                var range = new AceRange(0,0,pos.row, pos.column);
                var valueBefore = session.getDocument().getTextRange(range);
                // Since regex do not support unicode...
                var unicodeName = toUnicode(name);
                var regex = new RegExp("(?:^|\\s)"+unicodeName+"\\s*=\\s*new\\s*([\\S^\\"+endToken+"]*)\\s*\\"+endToken);

                var result = regex.exec(valueBefore);

                var completions = [];

                if (result !== null && result.length>0) {
                    var className = result[1];
                    var methods = TEnvironment.getClassMethods(className);
                    var methodNames = Object.keys(methods);
                    methodNames = TUtils.sortArray(methodNames);
                    for (var i=0;i<methodNames.length;i++) {
                        completions.push({
                            caption: methodNames[i],
                            value: methods[methodNames[i]]
                        });
                    }
                }
                callback(null, completions);
            }
        };
    };
    
    return TEditor;
});
