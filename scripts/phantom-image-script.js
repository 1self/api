var page = require('webpage').create(),
    address, output, size;

page.settings.userAgent = 'WebKit/534.46 Mobile/9A405 Safari/7534.48.3';
page.settings.viewportSize = { width: 400, height: 600 };

if (phantom.args.length < 4 || phantom.args.length > 5) {
    phantom.exit();
} else {
    address = phantom.args[0];
    output = phantom.args[1];
    width = phantom.args[2];
    height = phantom.args[3];
    // page.viewportSize = { width: width, height: height };
    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('Unable to load the address!');
            phantom.exit();
        } else {
            window.setTimeout(function () {
                page.clipRect = { top: 0, left: 0, width: width, height: height };
                page.render(output);
                phantom.exit();
            }, 4000);
        }
    });
}