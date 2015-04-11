(function(){function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
var PlanHWApi = "https://api.planhw.com/"
angular.module('PlanHW', ['ngRoute'])
    .config(function($routeProvider, $httpProvider) {
        
        $routeProvider
        
        .when('/',{
            templateUrl: 'pages/landing.html',
            controller: 'IndexCtrl'
        })
        .when('/signup',{
            templateUrl: 'pages/signup.html'
        })
        .when('/signin',{
            templateUrl: 'pages/signin.html',
            controller: 'SigninCtrl'
        })
        .when('/homework',{
            templateUrl: 'pages/homework.html',
            controller: 'HWCtrl'
        })
        .when('/tos',{
            templateUrl: 'pages/tos.html'
        })
            
    }).run(function($rootScope, $location){
        $rootScope.flashes = []
        $rootScope.flashesNow = []
        $rootScope.$on('$routeChangeSuccess', function () {
            $rootScope.flashesNow = $rootScope.flashes
            $rootScope.flashes = []
        });
        $rootScope.signout = function(){
            $rootScope.student_id = null
            $rootScope.student_token = null
            $location.path('/')
        }
    }).controller('IndexCtrl', function ($scope) {
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
    }).controller('HWCtrl',function($scope, $rootScope, $http, $location){
        $scope.reload = function(){
            if($rootScope.sudent_id !== null){
                $http.get(PlanHWApi+'students/'+$rootScope.student_id+'/hw?token='+$rootScope.student_token)
                .success(function(data){
                    $scope.hw = []
                    angular.forEach(data['homeworks'], function(homework){
                        homework.due_date = moment.unix(homework.homework.due_date).calendar()
                        
                        if(homework.homework.completed){
                            if($scope.showComplete) $scope.hw.push(homework)
                        } else if ($scope.showIncomplete){
                            $scope.hw.push(homework)
                        }
                    })
                }).error(function(){
                    $rootScope.flashes.push({class: "danger", message:"Please sign in, again."})
                    $location.path('/signin')
                })
            } else {
                $rootScope.flashes.push({class: "danger", message:"Sign in first!"})
                $location.path('/signin')
            }}
        $scope.input = function(homework){
            var days = ["su", "mo", "tu", "we", "th", "fr", "sa"];
            
            homework.title = homework.input
            homework.description = String(homework.input.match(/\((.*)\)$|about\b(.*)$/i)).split(',')[1]
            if(homework.description === null || homework.description === ""){
                homework.description = String(homework.input.match(/\((.*)\)$|about\b(.*)$/i)).split(',')[0]
            }
            var match = homework.input.match(/(?:due|by) (.{2})(?:(?:.+?)?)\b(?: at ([1-2]?[1-9]):([0-5][0-9])(?: ?(PM|AM))?)?/i);
            $scope.day = moment();
            if (match && match[1]) {
                $scope.day = $scope.day.day(days.indexOf(match[1].trim().toLowerCase()))
                if(match[2] && match[3]) {
                    var hours = parseInt(match[2])
                    var minutes = parseInt(match[3])
                    if(match[4]){
                        if(match[4].trim().toUpperCase() === "PM"){
                            hours += 12
                        }
                    }
                    if(hours === 12 || hours === 24){
                        hours -= 12
                    }
                    $scope.day = $scope.day.hour(hours).minute(minutes)
                }
                if(moment().day() > $scope.day.day()){
                    $scope.day.add(7,'d');
                }
            } else {
                $scope.day = $scope.day.add(1,'d');
            }
            $scope.due_words = $scope.day.calendar();
            homework.due_date = $scope.day.unix();
            homework.title = homework.title.replace(/(\s\((.*)\)$|\sabout\b(.*)$)|((?:due|by) (.{2})(?:(?:.+?)?)\b(?: at \S{1,2}:\S\S(?: ?(PM|AM))?)?)/ig, "");
        }
        $scope.complete = function(homework){
            $http.put(PlanHWApi+"/students/"+$rootScope.student_id+"/hw/"+homework.id+"?token="+$rootScope.student_token,
                      {completed:!(homework.completed)})
                .success(function(){
                    $scope.reload();
            })
        }
        $scope.update = function(homework){
            $http.put(PlanHWApi+'students/'+$rootScope.student_id+'/hw/'+homework.homework.id+'?token='+$rootScope.student_token,homework.homework)
            .success(function(){
                homework.editing = false
                $scope.reload();
            }).error(function(data){
                angular.forEach(data['errors'], function(error){
                    $rootScope.flashesNow.push({class: 'warning',message: error}); 
                })
            })
        }
        $scope.new = function(homework){
            $http.post(PlanHWApi+'students/'+$rootScope.student_id+'/hw?token='+$rootScope.student_token,homework)
            .success(function(){
                $scope.reload();
                $scope.homework = null;
            }).error(function(data){
                angular.forEach(data['message']['errors'], function(error){
                    $rootScope.flashesNow.push({class: data['message']['type'],message: error}); 
                })
            })
        }
        $scope.delete = function(id){
            $rootScope.flashesNow.push({class: 'info', message: 'Deleting...'})
            $http.delete(PlanHWApi + 'students/'+$rootScope.student_id+'/hw/'+id+'?token='+$rootScope.student_token)
            .success(function(data){
                $scope.reload();
            }).error(function(data, status){
                $rootScope.flashesNow.push({class: 'danger', message:'Something went wrong in deleting your homework.'})
                console.log('Something went wrong in deleting homework with id of ' + id)
                console.log('Got ' + status + ' response:')
                console.log(data)
            })
            $rootScope.flashesNow.pop()
        }
        $scope.show = function(type){
            if(type === 'complete'){
                $scope.showing = "Completed"
                $scope.showComplete = true
                $scope.showIncomplete = false
            } else if (type === 'all'){
                $scope.showing = "Everything"
                $scope.showComplete = true
                $scope.showIncomplete = true
            } else {
                $scope.showing = null
                $scope.showComplete = false
                $scope.showIncomplete = true
            }
            $scope.reload();
        }
        $scope.show()
        $scope.toMoment = function(unixTime){
            return moment.unix(unixTime);
        }
    }).controller('SigninCtrl', function($scope, $rootScope, $http, $location){
        $scope.signinError = null;
        $scope.signin = function(username,password){
            $http.get(PlanHWApi+'login?username='+username+'&password='+encodeURIComponent(password))
            .success(function(data){
                $rootScope.student_token = data['login']['token']
                $rootScope.student_id = data['student']['id']
                $rootScope.student = data['student']
                $rootScope.flashes.push({message: "Welcome back to PlanHW!", class: 'success'})
                $location.path('/homework')
            }).error(function(data,status){
                if(status === 401){
                    $scope.signinError = "Wrong username/password.";
                }
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
    }}).directive('signup', function(){return{
        restrict: 'AE',
        replace: true,
        scope: {},
        template: '<div ng-include="\'directives/signup_form.html\'"></div>',
        controller: function($scope, $http, $rootScope, $location){
            $scope.signupErrored = false;
            $scope.student = {};
            $scope.gravatarInfo = "";
            $scope.gravatarUpdate = function(){
                $http.jsonp("http://www.gravatar.com/" + md5($scope.student.email) + ".json?callback=JSON_CALLBACK")
                    .success(function(data){
                        $scope.student.name = data['entry'][0]['name']['givenName'];
                        $scope.student.username = data['entry'][0]['preferredUsername'];
                        $scope.gravatarInfo = "If you'd like to change this image, log in to Gravatar."
                    }).error(function(data){
                        $scope.gravatarInfo = "If you'd like to change this image, create an account at Gravatar."
                    });
                },
            $scope.signup = function(student){
                $http.post(PlanHWApi+'students/', student)
                .success(function(){
                    alert("Welcome to PlanHW, please check your email and confirm it.");
                    $location.path('/signin')
                }).error(function(data, status){
                    $scope.signupErrored = true;
                    if(status === 422){
                        $scope.signupErrors = data['errors'];
                    } else {
                        $scope.signupErrors = ["Something went wrong, try again?"]
                    }
                });
            };
            $scope.good_confirm = false;
        }
    }});


var kkeys = [], konami = "38,38,40,40,37,39,37,39,66,65,13";$(document).keydown(function(e){kkeys.push( e.keyCode );if (kkeys.toString().indexOf( konami ) >= 0 ) {$(document).unbind('keydown',arguments.callee);alert("I like potatoes.");$("body").addClass("konami");}});})();