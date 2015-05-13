if($(location).attr('hostname').match(/^.+?\.\D+?$/i) || confirm("Use production API?")){
    var PlanHWApi = "https://api.planhw.com/"
} else {
    var PlanHWApi = "http://localhost:3000/"
}
Offline.options = {checks: {xhr: {url: PlanHWApi}}};

(function(){
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
addToHomescreen();
angular.module('PlanHW', ['ngRoute','ui.bootstrap.datetimepicker','webStorageModule','ngSanitize'])
    .config(function($routeProvider, $httpProvider) {
        
        $routeProvider
        
        .when('/',{
            templateUrl: 'pages/landing.html',
            controller: 'IndexCtrl'
        })
        .when('/flash/:message/:page',{
            templateUrl: 'pages/landing.html',
            controller: 'FlashCtrl'
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
        .when('/forgotpass',{
            templateUrl: 'pages/forgot_pass.html',
            controller: 'ForgotPassCtrl'
        })
            
    }).controller('FlashCtrl',function($rootScope,$routeParams,$location){
        var message = decodeURIComponent($routeParams.message)
        $rootScope.flashes.push({class:'info', message: message})
        var page = decodeURIComponent($routeParams.page)
        if(page === 'root') page = ''
        $location.path('/' + page)
    })
    .controller('SettingsCtrl',function($rootScope,$scope,$routeParams,$http,$sce,$refreshStudent){
        console.log($refreshStudent())
        
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
            $scope.profile = section === 'profile'
            $scope.security = section === 'security'
            $scope.schedule = section === 'schedule'
            $scope.pro = section === 'pro'
            $scope.showFriends = section === 'friends'
            if($scope.showFriends) $scope.loadStudents()
        }
        $scope.update = function(student){
            $http.put(PlanHWApi + 'students?token=' + $rootScope.student_token, student)
                .success(function(data){
                    student.password = null, student.password_confirm = null
                    $refreshStudent()
                })
            ;
        }
        $scope.friendRequest = function(friend){
            $http.get('https://api.planhw.com/friend/'+friend+'?token=' + $rootScope.student_token)
                .success(function(data){
                    data = data || 'Sent friend request!'
                    $rootScope.flashesNow.push({class:'success',message:data})
                })
                .error(function(data){
                    data[1][0] = data[1][0] || 'Something went wrong'
                    $rootScope.flashesNow.push({class:'danger',message:data[1][0]})
                })
        }
        $scope.removeFriend = function(friend){
            $http.delete('https://api.planhw.com/friend/'+friend+'?token=' + $rootScope.student_token)
                .success(function(data){
                    data = data || 'Removed.'
                    $rootScope.flashesNow.push({class:'success',message:data})
                })
                .error(function(data){
                    data = data || 'Something went wrong'
                    $rootScope.flashesNow.push({class:'danger',message:data})
                })
        }
        $scope.show2step = function(){
            $scope.qrURL = PlanHWApi + '2step.qr?token=' + $rootScope.student_token
        }
        
        $scope.loadStudents = function(){
            var allStudents;
            $http.get('https://api.planhw.com/students')
                .success(function(data) {
                    data = data.students
                    data.forEach(function(student, index){
                        data[index] = student.student
                    })
                    $(function(){
                        $('#add-friend').selectize({
                            create: true,
                            valueField: 'id',
                            searchField: 'username',
                            options: data,
                            render: {
                                item: function(item, escape) {
                                    return '<div>' + escape(item.username) + '</div>'
                                },
                                option: function(item, escape) {
                                    return '<div>' +
                                        '<span class="bold">' + escape(item.name) + '</span>' + 
                                        '<span class="caption"> ('+ escape(item.username) +  ')</span>' +
                                    '</div>'
                                }
                            }
                        });
                    })
                });
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
    .run(function($rootScope, $location, webStorage, $http){
        $rootScope.flashes = []
        $rootScope.flashesNow = []
        $rootScope.$on('$routeChangeSuccess', function () {
            $rootScope.flashesNow = $rootScope.flashes
            $rootScope.flashes = []
            $('.modal').modal('hide');
        });
        $rootScope.signout = function(){
            $rootScope.student_id = null
            $rootScope.student_token = null
            $rootScope.student = null
            $location.path('/')
            webStorage.remove('login_data')
        }
        var login_data = webStorage.get('login_data') 
        if(login_data){
            $rootScope.student_token = login_data['token']
            $rootScope.student_id = login_data['student']['id']
            $rootScope.student = login_data['student'] 
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
    .controller('HWCtrl',function($scope, $rootScope, $http, $location, webStorage){    
        
        $scope.reload('incomplete',function(){
            $scope.autoChooseView()
            $scope.loaded = true
        });    
    
        $scope.share = function(homework,student){
            var temp_date = homework.due_date
            homework.due_date = homework.due_date.toISOString();
            $http.post(PlanHWApi+'hw?token='+$rootScope.student_token+'&friend_id='+student.id,homework)
            .success(function(){
                $rootScope.flashesNow.push({class: 'success',message: 'Sent to ' + student.name});
            }).error(function(data){
                angular.forEach(data['message']['errors'], function(error){
                    $rootScope.flashesNow.push({class: data['message']['type'],message: error}); 
                })
            })
            homework.due_date = temp_date
        }
        $scope.reload = function(show, after){
            if($rootScope.sudent_id !== null){
                $http.get(PlanHWApi+'hw?token='+$rootScope.student_token)
                .success(function(data){
                    webStorage.remove('hw')
                    $scope.hw = data['homeworks']
                    if(webStorage.get('login_data')) webStorage.add('hw',$scope.hw)
                }).error(function(data,status){
                    if(webStorage.get('hw')){
                        $scope.hw = webStorage.get('hw') 
                    } else {
                        $rootScope.flashes.push({class:'danger', message: 'Please sign in.'})
                        $location.path('/signin')
                    }
                }).finally(function(){
                    if(show){
                        $scope.show(show, after)
                    } else {
                        $scope.toView()
                    }
                })
            } else {
                $rootScope.flashes.push({class: "danger", message: "Sign in first!"})
                $location.path('/signin')
            }
        }
        
        $scope.marked = function(markdown){
            if(markdown) return marked(markdown)
        }
        $scope.markdown = function(homework){
            homework.descHTML = $scope.marked(homework.homework.description)
        }
        
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
            $scope.hw = $scope.hw.sort(function(x, y) {
                x = x.homework.completed
                y = y.homework.completed
                return (x === y)? 0 : x? 1 : -1;
            });
            angular.forEach($scope.hw, function(homework){
                $scope.markdown(homework)
            })
        }
        
        var friends = $rootScope.student.friends; friends.forEach(function(friend, index){
            if(friend.student){
                friend2 = friend.student
                friend2.name = friend2.name.split(' ')[0]
                friends[index] = friend2
            }
        })
        var sifter = new Sifter(friends);
    
        $scope.suggestShareFriend = null
        
        $scope.input = function(homework){
            homework.description = homework.input.match(/\((.+)\)/i)
            if(homework.description){
                homework.description = homework.description[1]
            }
            var date;
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
            if(homework.input.length < 3){
                $scope.suggestShareFriend = null
            } else {
                homework.input.split(' ').forEach(function(word){
                    var results = sifter.search(word, {
                        fields: ['username','name'],
                        sort: [{field: 'name', direction: 'asc'},{field: 'username', direction: 'asc'}],
                        limit: 1
                    });
                    var result = results.items[0]
                    if(result && result.score >= .45 && (word.length > 3 || word === friends[result.id].name)){
                        $scope.suggestShareFriend = friends[result.id]
                    }
                })
            }
        }
        
        $scope.complete = function(homework){
            homework.homework.completed = !homework.homework.completed
            $http.put(PlanHWApi + 'hw/'+homework.homework.id+'?token='+$rootScope.student_token,homework.homework)
            .success(function(){
                $scope.toView();
            }).error(function(data, status){
                if(data && status){
                    homework.homework.completed = {completed:!(homework.homework.completed)}
                } else $scope.toView();
            })
        }
        
        $scope.update = function(homework){
            $http.put(PlanHWApi+'hw/'+homework.homework.id+'?token='+$rootScope.student_token,homework.homework)
            .success(function(){
                homework.editing = false
                $scope.markdown(homework)
            }).error(function(data, status){
                if(data && status){
                    angular.forEach(data['errors'], function(error){
                        $rootScope.flashesNow.push({class: 'warning',message: error}); 
                    })
                } else {
                    homework.editing = false
                    markdown(homework)
                }
            })
        }
        
        $scope.new = function(homework){
            //Get ready to send things to the API
            
            var temp_date = homework.due_date
            homework.due_date = homework.due_date.toISOString();
            
            //Send homework to the API
            $http.post(PlanHWApi+'hw?token='+$rootScope.student_token,homework)
            .success(function(){
                $scope.homework = null;
                $scope.reload()
            }).error(function(data){
                angular.forEach(data['message']['errors'], function(error){
                    $rootScope.flashesNow.push({class: data['message']['type'],message: error}); 
                })
            })
            homework.due_date = temp_date
            $scope.suggestShareFriend = null 
        }
        
        $scope.delete = function(homework){
            $rootScope.flashesNow.push({class: 'info', message: 'Deleting...'})
            $http.delete(PlanHWApi + 'hw/'+homework.homework.id+'?token='+$rootScope.student_token)
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
        
        $( window ).resize(function(){
            $scope.autoChooseView()
            $scope.$apply()
        })
        
        $scope.autoChooseView = function(){
            if(768 >= $(window).width()){
                $scope.chooseView('Cards')
            } else if (768 < $(window).width()){
                $scope.chooseView('List')
            }
        }
    })
    .controller('SigninCtrl', function($scope, $signin){
        $scope.signinError = null
        $scope.signin = function(remember){
            $signin($scope.username, $scope.password, remember, $scope.otp)
        }
    })
    .controller('ForgotPassCtrl',function($scope, $http, $rootScope, $location){
        $scope.changePass = function(){
            console.log({password: $scope.password, password_confirmation: $scope.password_confirm})
            $http.post(PlanHWApi + 'reset_password/' + $scope.username, {password: $scope.password, password_confirmation: $scope.password_confirm})
            .success(function(data,status){
                $rootScope.flashes.push({class: 'success', message: data})
                $location.path('/signin')
            })
            .error(function(data,status){
                $rootScope.flashesNow.push({class: 'info', message: data})
            })
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
    .factory('$signin',function($rootScope, $http, $location, webStorage){
        return function(username, password, remember, otp) {
        url = PlanHWApi+'login?username='+encodeURIComponent(username)+'&password='+encodeURIComponent(password)+'&auth_code='+otp
        $http.get(url)
            .success(function(data){
                password = null;
                $rootScope.student_token = data['token']
                console.log(data)
                $rootScope.student_id = data['student']['id']
                $rootScope.student = data['student']
                if(remember){
                    webStorage.remove('login_data')
                    webStorage.add('login_data',data)
                }
                $rootScope.flashes.push({message: "Welcome back to PlanHW!", class: 'success'})
                $location.path('/homework');
                $rootScope.showotp = false
            }).error(function(data,status){
                if(status === 401){
                    if(data === 'Please include OTP.'){
                        $rootScope.flashesNow.push({message: 'Please include a correct one time passcode (from Google Authenicator)', class: 'info'})
                        $rootScope.showotp = true
                    } else {
                        $rootScope.flashesNow.push({message: "Wrong username/password.", class: 'danger'})
                    }
                } else {
                    $rootScope.flashesNow.push({message: "Something went wrong.", class: 'danger'})
                }
            });
    }})
    .factory('$refreshStudent',function($rootScope, $http){
        return function(){
            $http.get(PlanHWApi + 'students/' + $rootScope.student_id + '?token=' + $rootScope.student_token)
            .success(function(data){
                $rootScope.student = data.student
                return true;
            }).error(function(data,status){
                $rootScope.flashesNow.push({message: "Could not refresh your info.", class: 'danger'})
                return false;
            });
    }});


var kkeys = [], konami = "38,38,40,40,37,39,37,39,66,65,13";$(document).keydown(function(e){kkeys.push( e.keyCode );if (kkeys.toString().indexOf(konami)>=0){$(document).unbind('keydown',arguments.callee);$("body").addClass("konami");}});})();