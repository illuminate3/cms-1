devise.define(['require', 'jquery'], function (require, $)
{

    var initSurrogate = function()
    {
        var elements = $('.dvs-select');

        applySurrogates(elements);
    };

    function applySurrogates(elements)
    {
        $.each(elements, function(index, el) {
            if($(this).parents('.dvs-select-wrapper').length === 0){

                var additionalClass = '';
                if($(this).hasClass('dvs-select-small')) {
                    additionalClass += ' dvs-select-small';
                }

                if($(this).hasClass('dvs-button-solid')) {
                    additionalClass += ' dvs-button-solid';
                }

                $(this).wrap("<span class='dvs-select-wrapper " + additionalClass + "'></span>");
                $(this).after("<span class='dvs-holder'></span>");

                addListeners(this);
            }
        });
    }

    function addListeners(el) {
        $(el).on('change', function(){
            var selectedOption = $(this).find(":selected").text();
            $(this).next(".dvs-holder").text(selectedOption);
        }).trigger('change');
    }

    return initSurrogate;


});