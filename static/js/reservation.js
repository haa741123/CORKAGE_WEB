$(document).ready(function() {
    let peopleCount = 2;

    $("#dateInfo").on('click', function() {
        $("<div>").datepicker({
            dateFormat: 'yy-mm-dd',
            onSelect: function(dateText) {
                $(".date-details").text(dateText + " / " + peopleCount + "명");
                $(this).datepicker("destroy").remove();
            },
            onClose: function() {
                $(this).datepicker("destroy").remove();
            }
        }).appendTo("body").position({
            my: "center top",
            at: "center bottom",
            of: "#dateInfo"
        }).datepicker("show");
    });

    $("#decreasePeople").on('click', function() {
        if (peopleCount > 1) {
            peopleCount--;
            $("#peopleCount").text(peopleCount);
            $("#peopleCountDisplay").text(peopleCount);
            updateDateDetails();
        }
    });

    $("#increasePeople").on('click', function() {
        peopleCount++;
        $("#peopleCount").text(peopleCount);
        $("#peopleCountDisplay").text(peopleCount);
        updateDateDetails();
    });

    function updateDateDetails() {
        let dateText = $(".date-details").text().split(" / ")[0];
        $(".date-details").text(dateText + " / " + peopleCount + "명");
    }
});
