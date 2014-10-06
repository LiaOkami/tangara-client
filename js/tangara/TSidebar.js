define(['TUI', 'TEnvironment', 'TProgram', 'TError', 'jquery', 'jquery.ui.widget', 'iframe-transport', 'fileupload', 'fancybox'], function(TUI, TEnvironment, TProgram, TError, $) {

    function TSidebar() {
        var domSidebar = document.createElement("div");
        domSidebar.id = "tsidebar";
        
        var domSwitch = document.createElement("div");
        domSwitch.id = "tsidebar-switch";
        var switchPrograms = document.createElement("div");
        switchPrograms.id = "tsidebar-switch-programs";
        switchPrograms.title = TEnvironment.getMessage("switch-programs");
        var switchResources = document.createElement("div");
        switchResources.id = "tsidebar-switch-resources";
        switchResources.title = TEnvironment.getMessage("switch-resources");
        domSwitch.appendChild(switchPrograms);
        domSwitch.appendChild(switchResources);
        domSidebar.appendChild(domSwitch);
        switchPrograms.onclick = function(e) { TUI.displayPrograms();};
        switchResources.onclick = function(e) { TUI.displayResources();};

        var domSidebarPrograms = document.createElement("div");
        domSidebarPrograms.id = "tsidebar-programs";
        domSidebar.appendChild(domSidebarPrograms);

        var domSidebarResources = document.createElement("div");
        domSidebarResources.id = "tsidebar-resources";
        var domSidebarUpload = document.createElement("form");
        domSidebarUpload.id = "tsidebar-upload";
        domSidebarUpload.setAttribute("method", "post");
        domSidebarUpload.setAttribute("enctype", "multipart/form-data");
        var domSidebarUploadHeader = document.createElement("div");
        domSidebarUploadHeader.id = "tsidebar-upload-header";
        var domSidebarUploadInput = document.createElement("input");
        domSidebarUploadInput.id = "tsidebar-upload-input";
        domSidebarUploadInput.setAttribute("type", "file");
        domSidebarUploadInput.setAttribute("multiple", "multiple");
        domSidebarUploadHeader.appendChild(domSidebarUploadInput);
        var domSidebarUploadButton = document.createElement("div");
        domSidebarUploadButton.id = "tsidebar-upload-button";
        var imageUpload = document.createElement("img");
        imageUpload.src = TEnvironment.getBaseUrl() + "/images/upload.png";
        domSidebarUploadButton.appendChild(imageUpload);
        domSidebarUploadButton.appendChild(document.createTextNode(TEnvironment.getMessage("resource_upload_files")));
        $(domSidebarUploadButton).click(function() {
            $(domSidebarUploadInput).click();
        });
        domSidebarUploadHeader.appendChild(domSidebarUploadButton);
        domSidebarUpload.appendChild(domSidebarUploadHeader);
        var domSidebarFiles = document.createElement("div");
        domSidebarFiles.id = "tsidebar-files";
        domSidebarUpload.appendChild(domSidebarFiles);
        domSidebarResources.appendChild(domSidebarUpload);
        var domEmptyMedia = document.createElement("div");
        domEmptyMedia.id="tsidebar-resources-empty";
        var domEmptyMediaP = document.createElement("p");
        domEmptyMediaP.appendChild(document.createTextNode(TEnvironment.getMessage("empty-media-library")));
        domEmptyMedia.appendChild(domEmptyMediaP);
        domSidebarResources.appendChild(domEmptyMedia);
        
        domSidebar.appendChild(domSidebarResources);
    
        var programsVisible = false;
        var empty = true;
        var uploadingDivs = {};
    
        this.getElement = function() {
            return domSidebar;
        };
        
        this.displayed = function() {
            this.displayPrograms();
            this.update();
            // Set up blueimp fileupload plugin
            // TODO: make use of acceptFileTypes and maxFileSize
            $(domSidebarUpload).fileupload({
                dataType: 'json',
                url:TEnvironment.getBackendUrl('addresource'),
                paramName:'resources[]',
                add: function (e, data) {
                    var newDivs=[];
                    var newNames=[];
                    try {
                        // Insert div corresponding to loading files
                        var files = data.files;
                        var project = TEnvironment.getProject();
                        var div;
                        var $domSidebarFiles = $(domSidebarFiles);
                        for (var i=0; i<files.length; i++) {
                            var file = files[i];
                            div = getResourceDiv(file.name, 'uploading', false);
                            // add progress bar
                            var domProgress = document.createElement("div");
                            domProgress.className = "progress-bar-wrapper";
                            var domBar = document.createElement("div");
                            domBar.className = "progress-bar";
                            domProgress.appendChild(domBar);
                            div.appendChild(domProgress);
                            var index = project.uploadingResource(file.name);
                            var where = $domSidebarFiles.find('.tsidebar-file:eq('+index+')');
                            if (where.length > 0)
                                where.before(div);
                            else 
                                $domSidebarFiles.append(div);
                            newDivs.push(div);
                            uploadingDivs[file.name] = $(div);
                        }
                        if (empty) {
                            domSidebarResources.removeChild(domEmptyMedia);
                            empty = false;
                        }
                        var $domSidebarResources = $(domSidebarResources);
                        $domSidebarResources.animate({scrollTop: $domSidebarResources.scrollTop()+$(div).position().top}, 1000);
                        data.submit();
                    } catch (error) {
                        // error
                        // 1st remove loading resources
                        for (var i=0; i<newNames.length;i++) {
                            project.removeUploadingResource(newNames[i]);
                            delete uploadingDivs[newNames[i]];
                        }
                        // 2nd remove loading resources div
                        for (var i=0; i<newDivs.length;i++) {
                            domSidebarFiles.removeChild(newDivs[i]);
                        }
                        // 3rd check if there is some file left, otherwise add "empty" message
                        if (!domSidebarFiles.hasChildNodes() && !empty) {
                            domSidebarResources.appendChild(domEmptyMedia);
                            empty = true;
                        }
                        
                        // 4th display error
                        TUI.addLogError(error);
                    }
                },
                done: function (e, data) {
                    var result = data.result;
                    if (typeof result !== 'undefined') {
                        if (typeof result.error !== 'undefined') {
                            // an error occured
                            // First remove corresponding divs
                            var project = TEnvironment.getProject();
                            for (var i=0; i<data.files.length; i++) {
                                var name = data.files[i].name;
                                var $div = uploadingDivs[name];
                                $div.remove();
                                project.removeUploadingResource(name);
                                delete uploadingDivs[name];
                            }
                            // Then display error
                            var message;
                            if (typeof result.error.message !== 'undefined' && typeof result.error.name !== 'undefined') {
                                message = TEnvironment.getMessage(result.error.message, result.error.name);
                            } else {
                                message = TEnvironment.getMessage(result.error);
                            }
                            var error = new TError(message);
                            TUI.addLogError(error);                            
                        } else if (typeof result.created !== 'undefined') {
                            // files where created
                            var project = TEnvironment.getProject();

                            for (var i=0; i<result.created.length; i++) {
                                var name = result.created[i].name;
                                var $div = uploadingDivs[name];
                                if (typeof $div !== 'undefined') {
                                    $div.find(".progress-bar-wrapper").fadeOut(2000, function() {$(this).remove()});
                                }
                                $div.removeClass('tsidebar-type-uploading');
                                var type = '';
                                if (typeof result.created[i].type !== 'undefined') {
                                    $div.addClass('tsidebar-type-'+result.created[i].type);
                                }
                                delete uploadingDivs[name];
                                project.resourceUploaded(name, type);
                            }
                        }
                    }
                },
                progress: function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    for (var i=0; i<data.files.length; i++) {
                        var name = data.files[i].name;
                        var $div = uploadingDivs[name];
                        if (typeof $div !== 'undefined') {
                            $div.find(".progress-bar").css('width',progress + '%');
                        }
                    }
                }
            });
        };
        
        this.update = function() {
            this.updatePrograms();
            this.updateResources();
        };
        
        this.updatePrograms = function() {
            var project = TEnvironment.getProject();
            var programList = project.getProgramsNames();
            var editedPrograms = project.getEditedPrograms();
            var currentProgram = TUI.getCurrentProgram();
            var editedNames = [];
            
            domSidebarPrograms.innerHTML = "";

            function addElement(name, id, displayedName, edited, current) {
                var element = document.createElement("div");
                element.className = "tsidebar-program";
                if (edited) {
                    element.className += " tsidebar-edited";
                }
                if (typeof current !== 'undefined' && current) {
                    element.className += " tsidebar-current";
                }
                $(element).click(function(e){
                    if ($(this).hasClass('tsidebar-renaming'))
                        return false;
                    if (current) {
                        // rename program
                        $(this).addClass('tsidebar-renaming');
                        var renameElement = document.createElement("input");
                        renameElement.type="text";
                        renameElement.className="tsidebar-rename";
                        renameElement.value = name;
                        $(renameElement).keydown(function (e) {
                            if (e.which === 13) {
                                // Enter was pressed
                                TUI.renameProgram(name, renameElement.value);
                            }
                            if (e.which === 27) {
                                // Escape was pressed
                                $(this).parent().removeClass('tsidebar-renaming');
                                $(renameElement).remove();
                            }
                        });
                        renameElement.onblur = function() {TUI.renameProgram(name, renameElement.value);};
                        $(this).append(renameElement);
                        renameElement.focus();
                    } else {
                        // edit program
                        TUI.editProgram(name);e.stopPropagation();
                    }
                });
                var nameElement = document.createElement("div");
                nameElement.id = "tsidebar-program-"+id;
                nameElement.appendChild(document.createTextNode(displayedName));
                element.appendChild(nameElement);
                if (edited) {
                    var closeElement = document.createElement("div");
                    closeElement.className = "tsidebar-close";
                    closeElement.onclick = function(e) { TUI.closeProgram(name);e.stopPropagation();};
                    element.appendChild(closeElement);
                }
                domSidebarPrograms.appendChild(element);
            }

            var currentName = "";
            
            if (typeof currentProgram !== 'undefined') {
                currentName = currentProgram.getName();
            }

            for (var i=0; i<editedPrograms.length;i++) {
                var program = editedPrograms[i];
                var programName = program.getName();
                editedNames.push(programName);
                addElement(programName, program.getId(), program.getDisplayedName(), true, programName === currentName);
            }
            
            for (var i=0; i<programList.length;i++) {
                var name = programList[i];
                if (editedNames.indexOf(name) === -1) {
                    addElement(name, TProgram.findId(name), name, false);
                }
            }
        };
        
        
        function getResourceDiv(name, type) {
            var resourceDiv = document.createElement("div");
            resourceDiv.className = "tsidebar-file tsidebar-type-"+type;
            var nameDiv = document.createElement("div");
            nameDiv.className = "tsidebar-file-name";
            var innerDiv = document.createElement("div");
            innerDiv.appendChild(document.createTextNode(name));
            nameDiv.appendChild(innerDiv);
            resourceDiv.appendChild(nameDiv);
            var imgDiv = document.createElement("div");
            imgDiv.className = "tsidebar-file-icon";
            resourceDiv.appendChild(imgDiv);            
            resourceDiv.onclick = function(e) {
                // set as current
                if (!$(this).hasClass('tsidebar-current')) {
                    $('.tsidebar-file').removeClass('tsidebar-current');
                    $(this).addClass('tsidebar-current');
                    TUI.setEditionEnabled(true);
                }
            };
            // preview
            imgDiv.onclick = function(e) {
                var parent = $(this).parent();
                if (parent.hasClass('tsidebar-current') && parent.hasClass('tsidebar-type-image')) {
                    // already selected: open using fancybox
                    $.fancybox(TEnvironment.getProjectResource(name));
                }
            };
            // rename
            nameDiv.onclick = function(e) {
                var parent = $(this).parent();
                if (parent.hasClass('tsidebar-current')) {
                    $(this).addClass('tsidebar-renaming');
                    var renameElement = document.createElement("textarea");
                    /*renameElement.type="text";*/
                    renameElement.className="tsidebar-rename";
                    renameElement.value = name;
                    $(renameElement).keydown(function (e) {
                        if (e.which === 13) {
                            // Enter was pressed
                            TUI.renameResource(name, renameElement.value);
                            e.preventDefault();
                        }
                        if (e.which === 27) {
                            // Escape was pressed
                            $(this).parent().removeClass('tsidebar-renaming');
                            $(renameElement).remove();
                        }
                    });
                    renameElement.onblur = function() {TUI.renameResource(name, renameElement.value);};
                    $(this).append(renameElement);
                    renameElement.focus();
                }
            }
            resourceDiv.setAttribute("draggable", "true");
            resourceDiv.ondragstart = function(e) {
                var element = $(e.target).find(".tsidebar-file-name > div");
                e.dataTransfer.setData("text/plain", "\""+element.text()+"\"");
            };
            return resourceDiv;
        }
        
        this.updateResources = function() {
            var project = TEnvironment.getProject();
            var resourcesNames = project.getResourcesNames();
            var resources = project.getResources();
            
            function addElement(name, type) {
                var div = getResourceDiv(name, type, false);
                domSidebarFiles.appendChild(div);
            }
            
            domSidebarFiles.innerHTML = "";
            if (resourcesNames.length === 0) {
                // no media: add message
                if (!empty) {
                    domSidebarResources.appendChild(domEmptyMedia);
                    empty = true;
                }
            } else {
                if (empty) {
                    domSidebarResources.removeChild(domEmptyMedia);
                    empty = false;
                }
                for (var i=0; i<resourcesNames.length; i++) {
                    var name = resourcesNames[i];
                    addElement(name, resources[name].type);
                }
                empty = false;
            }
        };
        
        this.updateProgramInfo = function(program) {
            var id = "#tsidebar-program-"+program.getId();
            $(id).text(program.getDisplayedName());
        };
        
        this.showLoading = function(name) {
            var id = "#tsidebar-program-"+TProgram.findId(name);
            var loadElement = document.createElement("div");
            loadElement.className = "tsidebar-loading";
            $(id).append(loadElement);
        };
        
        this.removeLoading = function(name) {
            var id = "#tsidebar-program-"+TProgram.findId(name);
            $(id).find(".tsidebar-loading").remove();
        };

        this.showRenamingProgram = function(name) {
            var id = "#tsidebar-program-"+TProgram.findId(name);
            var loadElement = document.createElement("div");
            loadElement.className = "tsidebar-loading";
            $(id).parent().append(loadElement);
        };

        this.showRenamingResource = function(name) {
            var nameDiv = $(".tsidebar-renaming");
            var loadElement = document.createElement("div");
            loadElement.className = "tsidebar-loading";
            nameDiv.parent().append(loadElement);
        };
        
        this.show = function() {
            $(domSidebar).show();
        };
        
        this.hide = function() {
            $(domSidebar).hide();
        };
        
        this.displayPrograms = function() {
            if (!programsVisible) {
                $(domSidebarPrograms).show();
                $(switchPrograms).addClass("active");
                $(domSidebarResources).hide();
                $(switchResources).removeClass("active");
                $(domSidebar).animate({width:"250px"}, 500);
                programsVisible = true;
                var edition = ($(domSidebarPrograms).find(".tsidebar-current").length>0);
                TUI.setEditionEnabled(edition);
            }
        };
        
        this.displayResources = function() {
            if (programsVisible) {
                if (!TEnvironment.isUserLogged()) {
                    // User is not logged: we cannot manage resources
                    var error = new TError(TEnvironment.getMessage('resources-unavailable-user-not-logged'));
                    TUI.addLogError(error);
                } else {
                    $(domSidebarPrograms).hide();
                    $(switchPrograms).removeClass("active");
                    $(domSidebarResources).show();
                    $(switchResources).addClass("active");
                    $(domSidebar).animate({width:"440px"}, 500);
                    programsVisible = false;
                    var edition = ($(domSidebarResources).find(".tsidebar-current").length>0);
                    TUI.setEditionEnabled(edition);
                }
            }
        };
    }
    
    return TSidebar;
});
