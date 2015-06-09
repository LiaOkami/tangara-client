define(['jquery', 'TEnvironment', 'TRuntime', 'TUtils', 'TObject', 'TLink'], function($, TEnvironment, TRuntime, TUtils, TObject, TLink) {
    var Learn = function() {
        // Do not call parent constructor, as we don't want this object to be erased when clearing the
        // Runtime
    };

    Learn.prototype = Object.create(TObject.prototype);
    Learn.prototype.constructor = Learn;
    Learn.prototype.className = "Learn";

    /*Tangara.prototype._write = function(value) {
        value = TUtils.getString(value);
        TUI.addLogMessage(value);
    };*/

    
    //Learn.countObject
    
    var statements = [];
    var frame = false;
    
    Learn.prototype.setStatements = function(value) {
        statements = value;
    };

    Learn.prototype.dumpStatements = function(value) {
        console.debug(statements);
    };
    
    Learn.prototype.setFrame = function(value) {
        frame = value;
    };
    
    function check(statement, value) {
        for (var key in value) {
            if (typeof statement[key] === "undefined") {
                console.log("key "+key+"not found in statement");
                return false;
            }
            if (typeof value[key] === 'object') {
                if (typeof statement[key] === 'object') {
                    if (!check(statement[key], value[key])) {
                        console.log("object key "+key+"not equal in statement");
                        return false;
                    }
                } else {
                    console.log("key "+key+"not object in statement");
                    return false;
                }
            } else {
                if (value[key] !== statement[key]) {
                    console.log("key "+key+"not equal in statement");
                    return false;
                }
            }
        }
        return true;
    }

    Learn.prototype.hasStatement = function(value) {
        for (var i=0; i<statements.length; i++) {
            var statement = statements[i];
            if (check(statement, value)) {
                return true;
            }
        }
        return false;
    };
    
    Learn.prototype.validateStep = function() {
        if (frame) {
            frame.validateStep();
        }
    };

    Learn.prototype.invalidateStep = function(message) {
        if (frame) {
            frame.invalidateStep(message);
        }
    };


    TEnvironment.internationalize(Learn);

    var learnInstance = new Learn();

    return learnInstance;
});



