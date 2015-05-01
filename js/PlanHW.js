var PlanHWApi = "https://api.planhw.com/"
Offline.options = {checks: {xhr: {url: PlanHWApi + 'students'}}};

(function(){
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
angular.module('PlanHW', ['ngRoute','ui.bootstrap.datetimepicker','ngCookies','webStorageModule','ngSanitize'])
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
        .when('/profile/:id',{
            templateUrl: 'pages/student.html',
            controller: 'ProfileCtrl'
        })
        .when('/settings',{
            templateUrl: 'pages/settings.html',
            controller: 'SettingsCtrl'
        })
            
    }).controller('SettingsCtrl',function($rootScope,$scope,$routeParams,$http,$sce){
        $http.jsonp("http://www.gravatar.com/" + md5($rootScope.student.email) + ".json?callback=JSON_CALLBACK")
            .success(function(data){
                $rootScope.student.bio = data['entry'][0]['aboutMe']
            })
            .error(function(){
                $http.jsonp("http://www.gravatar.com/" + $rootScope.student.username + ".json?callback=JSON_CALLBACK")
                    .success(function(data){
                        $rootScope.student.bio = data['entry'][0]['aboutMe']
                    })
                ;
            })
        ;
        $scope.show = function(section){
            $scope.profile = false, $scope.security = false, $scope.schedule = false
            if(section === 'profile') $scope.profile = true
            if(section === 'security') $scope.security = true
            if(section === 'schedule') $scope.schedule = true
        }
        $scope.update = function(student){
            $http.put(PlanHWApi + 'students/' + $rootScope.student_id + '?token=' + $rootScope.student_token, student)
                .success(function(data){
                    $rootScope.flashesNow.push({class:'success',message:'Changes saved.'})
                    student.password = null, student.password_confirm = null
                })
            ;
        }
        $scope.show('profile');
    })
    .controller('ProfileCtrl',function($rootScope,$scope,$routeParams,$http,$sce){
        $http.get(PlanHWApi + 'students/' + $routeParams.id)
            .success(function(data){
                $scope.student = data.student
                $http.jsonp("http://www.gravatar.com/" + md5($scope.student.email) + ".json?callback=JSON_CALLBACK")
                    .success(function(data){
                        $scope.bio = data['entry'][0]['aboutMe']
                    })
                    .error(function(){
                            $http.jsonp("http://www.gravatar.com/" + $scope.student.username + ".json?callback=JSON_CALLBACK")
                        .success(function(data){
                            $scope.bio = data['entry'][0]['aboutMe']
                        })
                    })
                ;
            })
    })
    .run(function($rootScope, $location, $cookieStore, $http){
        $rootScope.flashes = []
        $rootScope.flashesNow = []
        $rootScope.$on('$routeChangeSuccess', function () {
            $rootScope.flashesNow = $rootScope.flashes
            $rootScope.flashes = []
        });
        $rootScope.signout = function(){
            $rootScope.student_id = null
            $rootScope.student_token = null
            $rootScope.student = null
            $location.path('/')
            $cookieStore.remove('login_data')
        }
        var login_data = $cookieStore.get('login_data') 
        if(login_data){
            $rootScope.student_token = login_data['login']['token']
            $rootScope.student_id = login_data['student']['id']
            $rootScope.student = login_data['student']
            var working_login;
            $http.get(PlanHWApi + '/test_login?id=' + $rootScope.student_id + "&token=" + $rootScope.student_token)
                .success(function(data){
                    if(!data.correct){
                        $rootScope.signout();
                    }
                })
            
        }
    })
    .controller('IndexCtrl',function($scope){
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

        $scope.timeFull = time.format('dddd');
        $scope.timeFromNow = time.fromNow();
        $('.show-slide2').hide();
        var slide2 = $('#slide2')
        var slide3 = $('#slide3')
        $(window).scroll(function(){
            distance = parseInt($(window).scrollTop())
            if(250 <= distance){
                $('#dictionary').addClass('fixed')
            } else {
                $('#dictionary').removeClass('fixed')
            }
            if (slide2.offset().top <= distance && distance <= slide3.offset().top - 750) {
                $('.show-slide2').show('slow')
            } else {
                $('.show-slide2').hide('fast')
            }
        })
    })
    .controller('HWCtrl',function($scope, $rootScope, $http, $location, webStorage,$cookieStore){
        $scope.reload = function(show, after){
            if($rootScope.sudent_id !== null){
                $scope.hw = []
                $http.get(PlanHWApi+'students/'+$rootScope.student_id+'/hw?token='+$rootScope.student_token)
                .success(function(data){
                    webStorage.remove('hw')
                    $scope.hw = data['homeworks']
                    if($cookieStore.get('login_data')) webStorage.add('hw',$scope.hw)
                }).error(function(){
                    if($cookieStore.get('login_data')){
                        $scope.hw = webStorage.get('hw') 
                    } else {
                        $rootScope.flashes.push({class:'danger', message: 'Please sign in.'})
                        $location.path('/signin')
                    }
                }).finally(function(){
                    $scope.loaded = true
                    if(show){
                        $scope.show(show, after)
                    } else {
                        $scope.toView()
                    }
                })
            } else {
                $rootScope.flashes.push({class: "danger", message: "Sign in first!"})
                $location.path('/signin')
            }}
        $scope.toView = function(before){
            if(before) before();
            angular.forEach($scope.hw, function(homework){
                homework.due_date = moment(homework.homework.due_date).calendar()
                if(homework.homework.completed){
                    homework.show = $scope.showComplete
                } else {
                    homework.show = $scope.showIncomplete
                }
            })
        }
        $scope.input = function(homework){
            homework.description = homework.input.match(/\((.+)\)/i)
            if(homework.description){
                homework.description = homework.description[1]
            }
            var date
            chrono.parse(homework.input).forEach(function(match){
                date = match
            });
            homework.due_date = moment(chrono.parseDate(homework.input));
            if(!homework.due_date.isValid()){                 
                homework.due_date = moment().add('1','d')
            }
            homework.title = homework.input.replace(/\((.+)\)/i, "")
            if(date){
                homework.title = homework.title.replace("due "+date.text,'').replace(date.text,'');
            }
        }
        $scope.complete = function(homework){
            homework.homework.completed = !homework.homework.completed
            $http.put(PlanHWApi+'students/'+$rootScope.student_id+'/hw/'+homework.homework.id+'?token='+$rootScope.student_token,homework.homework)
            .success(function(){
                $scope.toView();
            }).error(function(data, status){
                if(data && status){
                    homework.homework.completed = {completed:!(homework.homework.completed)}
                } else $scope.toView();
            })
        }
        $scope.update = function(homework){
            $http.put(PlanHWApi+'students/'+$rootScope.student_id+'/hw/'+homework.homework.id+'?token='+$rootScope.student_token,homework.homework)
            .success(function(){
                homework.editing = false
            }).error(function(data, status){
                if(data && status){
                    angular.forEach(data['errors'], function(error){
                        $rootScope.flashesNow.push({class: 'warning',message: error}); 
                    })
                } else {
                    homework.editing = false
                }
            })
        }
        $scope.new = function(homework){
            var temp_date = homework.due_date
            homework.due_date = homework.due_date.toISOString();
            $http.post(PlanHWApi+'students/'+$rootScope.student_id+'/hw?token='+$rootScope.student_token,homework)
            .success(function(){
                $scope.reload();
                $scope.homework = null;
            }).error(function(data){
                angular.forEach(data['message']['errors'], function(error){
                    $rootScope.flashesNow.push({class: data['message']['type'],message: error}); 
                })
            })
            homework.due_date = temp_date
        }
        $scope.delete = function(homework){
            $rootScope.flashesNow.push({class: 'info', message: 'Deleting...'})
            $http.delete(PlanHWApi + 'students/'+$rootScope.student_id+'/hw/'+homework.homework.id+'?token='+$rootScope.student_token)
            .success(function(data){
                $scope.reload();
            }).error(function(data, status){
                if(data && status){
                    $rootScope.flashesNow.push({class: 'danger', message:'Something went wrong in deleting your homework.'})
                    console.log('Something went wrong in deleting homework with id of ' + homework.homework.id)
                    console.log('Got ' + status + ' response:')
                    console.log(data)
                } else {
                    homework = null
                }
                
            })
            $rootScope.flashesNow.pop()
        }
        $scope.show = function(type,after){
            if(type === 'complete'){
                $scope.showing = "Completed"
                $scope.showComplete = true
                $scope.showIncomplete = false
                $scope.showAll = false
            } else if (type === 'all'){
                $scope.showing = "Everything"
                $scope.showComplete = true
                $scope.showIncomplete = true
                $scope.showAll = true
            } else {
                $scope.showing = null
                $scope.showComplete = false
                $scope.showIncomplete = true
                $scope.showAll = false
            }
            $scope.toView(after);
        }
        $scope.chooseView = function(view){
            $scope.view = toTitleCase(view)
            view = view.toLowerCase();
            $scope.cards = view === 'cards'
            $scope.list = view === 'list'
        }
        $scope.reload('incomplete',function(){$scope.chooseView('Cards')});
    })
    .controller('SigninCtrl', function($scope, $signin){
        $scope.signinError = null
        $scope.signin = function(remember){
            $signin($scope.username, $scope.password, remember)
        }
    })
    .directive('gravatar', function(){return{
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
    }})
    .directive('signup', function(){return{
        restrict: 'AE',
        replace: true,
        scope: {},
        template: '<div ng-include="\'directives/signup_form.html\'"></div>',
        controller: function($scope, $http, $rootScope, $location, $signin){
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
                    $rootScope.firstSignin = true;
                    $signin(student.username,student.password,false)
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
    }})
    .directive('signin',function(){return{
        restrict: 'E',
        templateUrl: '/directives/signin_popup.html',
        controller: 'SigninCtrl'
    }})
    .factory('$signin',function($rootScope, $http, $location, $cookieStore){
        return function(username, password, remember) {
        $http.get(PlanHWApi+'login?username='+encodeURIComponent(username)+'&password='+encodeURIComponent(password))
            .success(function(data){
                password = null;
                $rootScope.student_token = data['login']['token']
                $rootScope.student_id = data['student']['id']
                $rootScope.student = data['student']
                if(remember){
                    $cookieStore.put('login_data',data)
                }
                $rootScope.flashes.push({message: "Welcome back to PlanHW!", class: 'success'})
                $('.modal').modal('hide');
                $location.path('/homework');
            }).error(function(data,status){
                if(status === 401){
                    $rootScope.flashesNow.push({message: "Wrong username/password.", class: 'danger'})
                } else {
                    $rootScope.flashesNow.push({message: "Something went wrong.", class: 'danger'})
                }
            });
    }});


var kkeys = [], konami = "38,38,40,40,37,39,37,39,66,65,13";$(document).keydown(function(e){kkeys.push( e.keyCode );if (kkeys.toString().indexOf( konami ) >= 0 ) {$(document).unbind('keydown',arguments.callee);alert("I like potatoes.");$("body").addClass("konami");}});})();