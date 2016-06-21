$('table').delegate('td', 'mouseover mouseleave', function (e) {
    var index = $(this).index() + 1;
    if (e.type == 'mouseover') {
        $(this).parent().addClass('hover');
        $('td:nth-child(' + index + ')').addClass('hover');
        $('th:nth-child(' + index + ')').addClass('hover');
    } else {
        $(this).parent().removeClass('hover');
        $('td:nth-child(' + index + ')').removeClass('hover');
        $('th:nth-child(' + index + ')').removeClass('hover');
    }
});

$('#hide').change(function () {
    if ($("#hide").prop("checked")) {
        $.each($('table tbody tr'), function () {
            var index = $(this).index() + 2;
            var normal = true;
            $(this).find('td').each(function () {
                if ($(this).hasClass('dangerous')) {
                    normal = false;
                }
            });
            if (normal) {
                $('td:nth-child(' + index + ')').hide();
                $('th:nth-child(' + index + ')').hide();
                $(this).hide();
            };
        });
    } else {
        $('tr').show();
        $('td').show();
        $('th').show();
    }
});

$('#search').keyup(function () {
    _this = this;
    let search = $(_this).val().toLowerCase();
    $.each($('table tbody td:first-child a'), function () {
        let fullName = $(this).attr('title');
        if ($(this).text().toLowerCase().indexOf(search) !== -1 ||
        (fullName && fullName.toLowerCase().indexOf(search) !== -1)) {
            $(this).parent().parent().show();
        } else {
            $(this).parent().parent().hide();
        }
    });
});
