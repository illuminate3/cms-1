devise.define(['jquery', 'dvsNodeView', 'dvsSidebarView', 'dvsCollectionsView', 'dvsAdminView', 'dvsPageData'], (function( $, nodeView, sidebarView, collectionsView, adminView, pageData ) {

    var savingCount = 0;
    var node = null;
    var sidebarListenersAdded = false;
    var nodesInitialized = false;

    var delay = (function(){
        var timer = 0;
        return function(callback, ms){
            clearTimeout (timer);
            timer = setTimeout(callback, ms);
        };
    })();

    function initialize() {
        $('body').on('dvsCloseAdmin', '#dvs-mode', function(){
            closeAdmin();
        });

        addSidebarGroupsChangeListener();
    }

    var listeners = {
        addEditorListeners: function() {

            $('#dvs-node-mode-button').click(function() {

                if (!$('#dvs-mode').hasClass('dvs-node-mode'))
                {
                    if (nodesInitialized === false)
                    {
                        nodeView();
                        addNodeListeners();
                        nodesInitialized = true;
                    }

                    $('#dvs-mode').removeClass('dvs-sidebar-mode');
                    $('#dvs-mode').addClass('dvs-node-mode');
                    $('#dvs-nodes').show();
                }
                else
                {
                    closeAdmin();
                }
            });
        },

        addBlockerListener: function() {
            $('#dvs-blocker').click(function() {
                closeAdmin();
            });
        },

        addSidebarListeners: function(_data) {

            if(!sidebarListenersAdded) {
                $('#dvs-sidebar').on('sidebarLoaded', function () {
                    addSidebarGroupsChangeListener();
                    addSidebarSaveListener();
                    addSidebarLanguageListener();
                    addContentRequestedChangeListener();
                    listeners.addCollectionsListeners();
                });
            }

            $('#dvs-sidebar').on('sidebarUnloadedLoaded', function () {
                listeners.removeCollectionsListeners();
            });

            sidebarListenersAdded = true;

        },

        addCollectionsListeners: function() {

            if (typeof node.collection !== "undefined" && node.collection !== '' && node.collection !== null) {
                $('#dvs-sidebar-collections').on('click', '#dvs-new-collection-instance', function(){
                    collectionsView.addCollection();
                });

                $('#dvs-sidebar-collections').on('click', '.dvs-collection-instance-remove', function(){
                    var _el = $(this);
                    var _id = $(this).data('id');

                    if(confirm('Are you sure?') !== true) { return false; }

                    collectionsView.removeCollection(_el, _id);
                });

                $('#dvs-sidebar-collections').on('keyup', 'input.dvs-collection-instance-name', function(){
                    var _val = $(this).val();
                    var _id = $(this).attr('name').substr(3);

                    delay(function(){
                        collectionsView.updateInstanceName(_id, _val);
                    }, 600 );
                });

                collectionsView.init();
            }
        },

        removeCollectionsListeners: function() {

            if (typeof node.collection !== "undefined" && node.collection !== '' && node.collection !== null) {
                $('#dvs-mode').off('click', '#dvs-new-collection-instance');
                $('#dvs-sidebar-collections').off('keyup', 'input.dvs-collection-instance-name');
            }
        }
    };

    function addLoader(_msg) {
        // Only add the loader if it isn't there already
        if (!$('.dvs-loading').length) {
            var _loader = $('<div>').addClass('dvs-loading onload').html(_msg);
            $('#dvs-mode').append(_loader);
            $('.dvs-loading').removeClass('onload');
        }
    }

    function removeLoader() {
        $('.dvs-loading').remove();
    }

    function addToSavingCount() {
        savingCount++;
        addLoader('Saving, please wait a moment');
    }

    function removeFromSavingCount() {
        savingCount--;
        removeLoader();
    }

    function checkGlobalStatus() {
        var _fieldScope = $('#field_scope').prop('checked');

        if (_fieldScope) {
            $('#current_field_scope').val('global');
        } else {
            $('#current_field_scope').val('page');
        }
    }

    function updateFieldId(response) {
        if (typeof response.id !== 'undefined') {
            var _sidebarFormAction = $('#dvs-sidebar-field-form').attr('action');

            var _parts = _sidebarFormAction.split('/');

            _parts[_parts.length - 1] = response.id;

            $('#dvs-sidebar-field-form').attr('action', _parts.join('/'));
        }
    }

    function addSidebarLanguageListener() {
        $('#dvs-sidebar-language-selector').change(function(){
            window.location = $(this).find("option:selected").val();
        });
    }

    function addSidebarSaveListener() {
        $('#dvs-sidebar .dvs-sidebar-save-group').click(function (evt) {

            $('#dvs-sidebar-current-element').find('form').each(function () {

                var config = {continue: true};
                $(this).trigger('beforeSave', [config]);

                addToSavingCount();

                if (config.continue) {
                    var data = $(this).serialize();

                    var url = $(this).attr('action');

                    // always pass in page_ids so we can restore
                    // fields from global to page version level if needed
                    data = data + '&page_version_id=' + pageData.page_version_id;
                    data = data + '&page_id=' + pageData.page_id;

                    $.ajax({
                        url: url,
                        data: data,
                        type: 'post',
                        success: function (response) {
                            removeFromSavingCount();
                            checkGlobalStatus();
                            updateFieldId(response);
                        },
                        error: function () {
                            alert('There was a problem saving these fields');
                        }
                    });
                }
            });
        });
    }

    function addSidebarGroupsChangeListener() {
        $('#dvs-sidebar-groups').change(function() {
            var _selectedGroup =  $(this).find('select').val();

            $('.dvs-sidebar-group').removeClass('dvs-active');
            $('#dvs-sidebar-group-' + _selectedGroup).addClass('dvs-active');

            // if breadcrumbs are visible, refresh and show element grid
            // with the newly selected collection's elements
            if($('#dvs-sidebar-breadcrumbs').is(':visible')) {
                sidebarView.showElementGrid();
            }

            $(".dvs-accordion").accordion("refresh");

            $('.dvs-fat-sidebar').click(function () {
                fattenUp();
            });
        });
    }

    function addNodeListeners() {
        $('#dvs-nodes').on('click', '.dvs-node', function() {
            var _node = $(this).data('dvsData');
            node = _node;

            closeAdmin();
            openSidebar(_node);
        });
    }

    /**
     * Handles saving/updating of the "content_requested" value for
     * a given field id. Only token, page_id, page_version_id and field
     * value are passed thru.
     */
    function addContentRequestedChangeListener() {
        $('#dvs-sidebar-current-element').on('change', '#content_requested', function() {
            var _form = $('#dvs-sidebar-field-form');
            var url = $(_form).prop('action');
            var _token = $(_form).find('input[name="_token"]').val();

            var config = {continue: true};
            $(this).trigger('beforeSave', [config]);

            addToSavingCount();

            if (config.continue) {
                var data = $(this).serialize();
                var fieldScope = $('#field_scope').prop('checked');

                data = data + '&_token=' + _token;
                data = data + '&page_version_id=' + pageData.page_version_id;
                data = data + '&page_id=' + pageData.page_id;
                data = data + '&current_field_scope=' + $('#current_field_scope').val();

                if (fieldScope) {
                    data = data + '&field_scope=global';
                } else {
                    data = data + '&field_scope=page';
                }

                $.ajax({
                    url: url,
                    data: data,
                    type: 'put',
                    success: function () {
                        removeFromSavingCount();
                    },
                    error: function () {
                        alert('There was a problem saving these fields');
                    }
                });
            }
        });
    }

    function closeAdmin()
    {
        $('#dvs-sidebar-container').hide().css('width','428px');
        $('#dvs-sidebar-scroller').css('width','478px');
        $('#dvs-mode').removeClass('dvs-node-mode dvs-admin-mode dvs-sidebar-mode');
        $('#dvs-nodes').hide(); //html('');
        $('#dvs-node-mode-button').html('Edit Page');
        $('#dvs-mode').trigger('closeAdmin');
    }

    function openSidebar(node)
    {
        $('#dvs-sidebar-container').show();
        sidebarView.init(node);

        $('#dvs-mode')
            .removeClass('dvs-node-mode dvs-admin-mode')
            .addClass('dvs-sidebar-mode');

        listeners.addBlockerListener();
        listeners.addSidebarListeners();
    }

    initialize();

    return listeners;

}));
