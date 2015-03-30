function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

angular.module('PlanHW', [])
    .controller('IndexCtrl', function ($scope) {
        $scope.signuplinks = true
        var body = $('body');
        var time = moment().add(1 + Math.floor(Math.random() * 6), 'days');
        var premium = false;
        $('.premium-feature').hide();
        $scope.PremiumAction = "Show";
        $scope.premiumToggle = function () {
            if (premium) {
                $scope.PremiumAction = "Show";
                premium = false;
                $('.premium-feature').hide('slow');
            } else {
                $scope.PremiumAction = "Hide";
                premium = true;
                $('.premium-feature').show('slow');
            }
            $scope.$apply();
        };
        $.ajax({
            url: 'http://api.randomuser.me/',
            dataType: 'json'
        }).done(function (data) {
            $scope.teacher = toTitleCase(data['results'][0]['user']['name']['title'] + ". " + data['results'][0]['user']['name']['last']);
            if ($scope.teacher === null) {
                $scope.teacher = "someone"
            }
            $scope.$apply();
        });

        body.append('<script src="bower_components/scrollr/dist/skrollr.min.js"></script>');
        var s = skrollr.init();

        $scope.timeFull = time.format('dddd');
        $scope.timeFromNow = time.fromNow();
    }).controller('SignupController', function($scope, $http){
        $scope.signupErrored = false;
        $scope.student = {email:'ben@bensites.com'};
        $scope.signup = function(student){
            $http.get('http://localhost:3000/students/new' +
                '?username=' + encodeURI(student.username) +
                '&name=' + encodeURI(student.name) +
                '&email=' + encodeURI(student.email) +
                '&password=' + encodeURI(student.password) +
                '&password_confirm' + encodeURI(student.password_confirm)
            ).success(function(){
                alert("Welcome to PlanHW!");
                http.get('http://localhost:3000/login?username='+ student.username +
                    'password=' + student.password
                ).success(function(data){
                })
            }).error(function(data, status){
                $scope.signupErrored = true;
                if(status === 422){
                    $scope.signupErrors = data['errors'];
                } else {
                    $scope.signupErrors = ["Something went wrong, try again?"]
                }
                console.log($scope.signupErrors);
            });
        };
    }).directive('gravatar', function(){return{
        restrict: 'AE',
        replace: true,
        scope: {
            size: '@',
            email: '='
        },
        template: '<img alt="Your Avatar" src="https://secure.gravatar.com/avatar/{{ md5(email) }}.png?s={{ size }}&d=monsterid"/>',
        controller: function($scope){
            $scope.md5 = md5
        }
    }});
