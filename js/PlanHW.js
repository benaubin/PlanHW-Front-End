var PlanHWApi = "https://api.planhw.com/"
addToHomescreen();

Array.prototype.range = function(){
    start = this[0];
    end = this[1] + 1;
    return Array(end-start).join(0).split(0).map(function(val, id) {return id+start});
};

(function(){
angular.module('PlanHW', ['ngRoute','ui.bootstrap.datetimepicker','webStorageModule','ngSanitize'])
    .config(function($routeProvider, $locationProvider, $provide) {
        $routeProvider.caseInsensitiveMatch = true;
    
        $provide.decorator('$sniffer', function($delegate) {
            if(window.location.hostname == '127.0.0.1'){
                $delegate.history = false;
                if(window.location.hash.match(/dev/)){
                    $locationProvider.hashPrefix('/dev')
                }
            };
            
            return $delegate;
        });
    
    
        $locationProvider.html5Mode(true);
    
        $routeProvider
        .otherwise({
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
        .when('/profile',{
            templateUrl: 'pages/student.html',
            controller: 'ProfileCtrl'
        })
        .when('/thanks',{
            templateUrl: 'pages/thanks.html'
        })
        .when('/homework',{
            templateUrl: 'pages/homework.html',
            controller: 'HWCtrl'
        })
        .when('/tos',{
            templateUrl: 'pages/tos.html'
        })
        .when('/press',{
            templateUrl: 'pages/press.html',
            controller: 'PressCtrl'
        })
        .when('/settings',{
            templateUrl: 'pages/settings.html',
            controller: 'SettingsCtrl'
        })
        .when('/forgotpass',{
            templateUrl: 'pages/forgot_pass.html',
            controller: 'ForgotPassCtrl'
        })
        .when('/login/:token',{
            templateUrl: 'pages/signin.html',
            controller: 'LoginCtrl'
        })
        
    })
    .controller('PressCtrl', function($scope){
        $scope.downloadPressKit = function(){
            window.open("/press.zip");
        }
    })
    .controller('LoginCtrl',function(Student, $rootScope, $routeParams, $location){
        Student.build.token($routeParams.token, true).then(function(student){
            $rootScope.student = student;
            $location.path('/homework');
        });
    })
    .controller('FlashCtrl',function($routeParams,$location,Flash){
        var message = decodeURIComponent($routeParams.message)
        Flash(message, 'info')
        var page = decodeURIComponent($routeParams.page)
        if(page === 'root') page = ''
        $location.path('/' + page)
    })
    .controller('SettingsCtrl',function($rootScope,$scope,$routeParams,$http,$sce,$location,PlanHWRequest,DigestTimes,Flash){
        if(!$rootScope.student){
            Flash('Please Login First', 'danger')
            $location.path('/')
        }
        $scope.getPro = function(cc,cvc,expMonth,expYear,plan,coupon){
            if(cc && cvc){
                Stripe.card.createToken({
                    number: cc,
                    cvc: cvc,
                    exp_month: expMonth,
                    exp_year: expYear
                }, function(status,token){
                    $rootScope.student.request.post('pro',{
                        source: token,
                        plan: plan,
                        coupon: coupon
                    }).then(function(){
                        Flash('Congrats! You now have PlanHW Pro!', 'success')
                        $rootScope.student.pro = true;
                    }, function(data){
                        $scope.show('pro')
                        Flash(data.error.message, 'danger', true)
                    });
                })
            } else {
                $rootScope.student.request.post('pro',{
                    plan: plan,
                    coupon: coupon
                }).then(function(){
                    Flash('Congrats! You now have PlanHW Pro!', 'success')
                    $rootScope.student.pro = true;
                }, function(data){
                    $scope.show('pro')
                    Flash(data.error.message, 'danger', true)
                });
            }
        }
        $scope.getRidOfPro = function(){
            if(confirm('Just making sure you know what you are doing -- this will get rid of your pro status on PlanHW IMMEDIATELY') && (prompt('Please confirm your username') === $rootScope.student.username)){
                $rootScope.student.request.delete('pro').then(function(){
                    Flash(':( - We got rid of your pro membership.', 'danger')
                    $rootScope.student.pro = false;
                });
            } else {
                $rootScope.flashesNow.push({class:'success', message: 'Awesome - You still have pro :)'})
            }
        }
        $scope.testCoupon = function(coupon){
            PlanHWRequest.get('coupon/'+ encodeURIComponent(coupon)).then(function(data){
                res.data = data
                $scope.couponInfo = data
                if(data === '100% off'){
                    $scope.paid = true
                }
            }, function(data){
                $scope.couponInfo = res.data
                $scope.paid = false
            });
        }
        $scope.show = function(section){
            $scope.profile = section === 'profile'
            $scope.security = section === 'security'
            $scope.schedule = section === 'schedule'
            $scope.pro = section === 'pro'
            $scope.showFriends = section === 'friends'
            if($scope.showFriends) $scope.loadStudents()
        }
        $scope.update = function(){
            $rootScope.student.update().then(function(){
                $rootScope.student.password = null, $rootScope.student.password_confirm = null;
                $rootScope.flashesNow.push({class: 'success', message: 'Saved!'})
            });
        }
        $scope.friendRequest = function(friend){
            $rootScope.student.get('friend/'+friend).then(function(){
                Flash("Sent friend request.", 'success')
            }, function(res){
                data = res.data;
                data[1][0] = data[1][0] || 'Something went wrong'
                $rootScope.flashesNow.push({class:'danger',message:data[1][0]})
            });
        }
        $scope.removeFriend = function(friend){
            $rootScope.student.delete('friend/'+friend).then(function(res){
                data = res.data || 'Removed friend.'
                $rootScope.flashesNow.push({class:'success',message:data})
            }, function(data){
                data = res.data || 'Something went wrong'
                $rootScope.flashesNow.push({class:'danger',message:data})
            })
        }
        $scope.show2step = function(){
            $scope.qrURL = PlanHWApi + '2step.qr?token=' + $rootScope.student_token
        }
        $scope.loadStudents = function(){
            var allStudents;
            $http.get(PlanHWApi+'students')
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
                                        '<p class="bold">' + escape(item.name) + '</p>' +
                                        '<p class="caption"> ('+ escape(item.username) +  ')</p>' +
                                    '</div>'
                                }
                            }
                        });
                    })
                });
        }
        $scope.show('profile');
        $scope.digestTimes = DigestTimes
    })
    .controller('ProfileCtrl',function($rootScope,$sce,$http){
        $http.jsonp("http://www.gravatar.com/" + md5($rootScope.student.email) + ".json?callback=JSON_CALLBACK")
            .then(function(data){
                $rootScope.student.bio = data.data['entry'][0]['aboutMe']
            }, function(){
                $http.jsonp("http://www.gravatar.com/" + $rootScope.student.username + ".json?callback=JSON_CALLBACK")
                .then(function(data){
                    $rootScope.student.bio = data.data['entry'][0]['aboutMe']
                })
            });
    })
    .run(function($rootScope, PlanHWRequest, $location, webStorage, Student, $Kiip){
        if($location.path() == '/bread'){
            $rootScope.logo = "BreadHW"
        } else {
            $rootScope.logo = "newsmaller"
        }
        if(window.location.hash.match(/dev/)){
            PlanHWApi = "http://localhost:3000/"
            $Kiip.setTestMode();
        }
        $rootScope.signout = function(location){
            $rootScope.student = null
            $location.path(location || '/')
            webStorage.remove('student')
        }
        $rootScope.flashesNow = []
        $rootScope.$on('$routeChangeSuccess', function () {
            try {$('.modal').modal('hide');} catch(err){}
        })
        PlanHWRequest.get('pro').then(function(res){
            Stripe.setPublishableKey(res.data)
        })
        if(webStorage.has('student')){
            student = webStorage.get('student')
            $rootScope.student = new Student(student.token, student.student)
            Student.build.token(student.token)
        }
    })
    .controller('IndexCtrl',function($scope, Homework){
        $scope.people = 'Students'
        $scope.hwinput = Homework.Input;
        $scope.homework = $scope.hwinput("Math Problems due next Tuesday (system of equations)")
        var changePeople = function(){
            var People = ['People','Students','Parents','Teachers','People','Students','Parents','Teachers','People','Students','Parents','Teachers','Dogs']
            var people = People[Math.floor(Math.random() * People.length)].split('')
            $scope.people = ''
            $scope.$apply()
            var i = 0;
            var next = function(){
                if(people[i]){
                    $scope.people = $scope.people + people[i]
                    $scope.$apply()
                    i++
                    window.setTimeout(next,50)
                } else {
                    window.setTimeout(changePeople,3500)
                }
            }
            next()
        }
        
            $scope.quotes = [
                            {
                               author: 'Bradley L.',
                               text: 'This is awesome!'
                            },
                            {
                               author: 'Egan W.',
                               text: 'really nice so far'
                            },
                            {
                                author: 'Mitch A.',
                                text: 'Nice!'
                            },

        //                   {
        //                       author: 'Mary-Hannah D.',
        //                       text: 'PlanHW is the bomb.'
        //                   },
                            {
                               author: 'Zeke N.',
                               text: 'It looks really good!'
                            }
                       ]

                window.setTimeout(changePeople,5000)
    })
    .controller('HWCtrl',function($scope, $rootScope, $location, webStorage, Student, Homework, Flash, $interval, $Kiip){
        $Kiip.setContainer('reward');
        if(!$rootScope.student){
            Flash('Please Login First', 'danger')
            $location.path('/')
        }
        $scope.share = function(homework,student){
            homework.create(false, student).then(function(){
                $rootScope.flashesNow.push({class: 'success', message: 'Sent to ' + student.name});
            }, function(data){
                angular.forEach(data['message']['errors'], function(error){
                    $rootScope.flashesNow.push({class: data['message']['type'],message: error}); 
                })
            })
        }
        
        $scope.reload = function(noComplete){
            return $rootScope.student.refreshHomework(!noComplete).then(function(homework){
                
            }, function(error){
                Flash(error.message, 'danger')
                $location.path('/')
            })
        }
        $scope.suggestShareFriend = null
        $scope.input = function(homework){
            $scope.homework = Homework.Input(homework.input, $rootScope.student)
            $scope.suggestShareFriend = homework.shareSuggest
        };
        $scope.new = function(homework){
            homework.create(true).then(function(newHomework){
                if(newHomework.error){
                    Flash(newHomework.errors[0], 'danger', true)
                } else {
                    $scope.homework = null
                }
            })
        }
        
        $scope.startTimer = function(homework){
            homework.before = new Date();
            homework.timer = $interval(function(){
                var elapsedTime = ((new Date()).getTime() - homework.before.getTime());
                homework.estimatedTime.spentNow += Math.floor(elapsedTime / 1000);
                homework.calcTimes()
                homework.before = new Date();
            }, 1000)
        }
        $scope.stopTimer = function(homework){
            $interval.cancel(homework.timer)
            homework.timer = "stopping"
            homework.save().then(function(){
                homework.timer = false;
            })
        }
        $scope.timerRunning = function(homework){
            return homework.timer && !$scope.timerStopping(homework)
        }
        $scope.timerStopping = function(homework){
            return homework.timer == 'stopping'
        }
        
        $scope.show = function(type){
            $scope.showComplete = type == 'complete' || type == 'all'
            $scope.showIncomplete = type == 'incomplete' || type == 'all'
        }
        $scope.reload(true).then(function(){
            $scope.show('incomplete')
            $scope.loaded = true
        }).then(function(){
            $scope.reload(false)
        });
        
        var actions = ['riding your bike', 'learning to code', 'taking your dog out for walk', 'going ice skating', 'playing xBox', 'checking the weather', 'to get the news', 'to annoy your siblings', 'to start a petition for a new emoji', 'selling cookies', 'telling your friends about PlanHW', 'playing soccer', 'playing football', 'playing D&D (Warning: You may never be seen outside of your house again)', 'making a random logo', 'screaming at people on the street', 'screaming at goats', 'thinking of a fun thing to do, and emailing it to hello@PlanHW.com', 'being awesome', 'learning rap', 'learning classical piano', 'a handstand', 'learning to dance', 'watching Netflix', 'watching Hulu', 'watching your cable company\'s on demand offering', 'reading a book', 'going to the Minecraft title screen until it says Minceraft', 'emailing your teacher about how you hate annoying emails', 'trolling teh forums', 'to have a Sim (from EA) do homework', 'to build a nucular bunker', 'a new sport', 'creating PlanHW lore', 'creating Fan-fic', 'to write a young adult novel', 'to teach a puppy to act like a cat', 'getting a Mac', 'starting a Ponzi scheme', 'playing Civ 3', 'to conduct foreign politics and avoid starting a nucular war', 'to genetically modify your least favorite family relitive', 'to organize your desk (if you can open it)', 'to crash the stock market', 'giving your SSN to your long lost Nigerian relative', 'to insist that the world is flat', 'pretending to be blind', 'to start a movement to get Taco Bell to make burgers and change their name to Burger Bell', 'to create good food for Mc. Donalds (this may be impossible)', 'to become a traveling salesman', 'to fix world hunger']
        
        $scope.newAction = function(){
            $scope.action = actions[Math.floor(Math.random() * actions.length)]
        }
        $scope.newAction()
    
    })
    .controller('SigninCtrl', function($scope, Student, $rootScope, $location, $httpParamSerializer, Flash){
        $scope.signinError = null
        $scope.signin = function(remember){
            Student.build.login($scope.username, $scope.password, remember, $scope.otp).then(function(data){
                if(data.error){
                    $rootScope.flashesNow.push({message: data.message, class: 'danger'})
                    switch(data.error){
                        case 'incorrect_otp':
                            $scope.showotp = true
                            break;
                        default:
                            $scope.password = null
                            break;
                    }
                } else {
                    $scope.password = null
                    $scope.showotp = false
                    $rootScope.student = data.student
                    Flash("Welcome back to PlanHW!", 'success')
                    $location.path('/homework');
                }
            })
        }
        $scope.signinToken = function(token){
            Student.build.token(token, true).then(function(student){
                $rootScope.student = student
                $location.path('/homework');
                $rootScope.flashesNow.push({message: "Welcome back to PlanHW!", class: 'success'})
            })
        }
        $scope.gsigninURL = PlanHWApi + 'oauth/google'
    })
    .controller('ForgotPassCtrl',function($scope, $http, $rootScope, $location){
        $scope.changePass = function(){
            $http.post(PlanHWApi + 'reset_password/' + $scope.username, {password: $scope.password, password_confirmation: $scope.password_confirm})
            .success(function(data,status){
                Flash(data, 'success')
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
        controller: function($scope, $http, $rootScope, $location, PlanHWRequest, Student){
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
                PlanHWRequest.post('students', student).then(function(){
                    $rootScope.firstSignin = true;
                    Student.build.login(student.username,student.password,false).then(function(data){
                        $rootScope.student = data.student;
                        $location.path('homework')
                    })
                },function(res){
                    $scope.signupErrored = true;
                    if(res.status === 422){
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
    .factory('DigestTimes',function(utcDiff){
        var digestTimes = [];
        ([utcDiff, 23].range().concat([0,utcDiff-1].range())).forEach(function(local, utc){
            var suffix = "AM";
            var local_human = local;
            if(local_human >= 12){
                local_human = local_human - 12;
                suffix = "PM";
            }
            if(local_human == 0) local_human = 12;
            digestTimes.push({
                utc: utc * 2,
                local: local * 2,
                human: local_human + ":00" + suffix
            })
            digestTimes.push({
                utc: utc * 2 + 1,
                local: local * 2 + 1,
                human: local_human + ":30" + suffix
            })
        })
        digestTimes.local = digestTimes.slice(0).sort(function(a, b) {return a.local - b.local});
    
        return digestTimes;
    })
    .factory('utcDiff', function(){
        var utcDiff = moment().hour() - moment.utc().hour();
        if(utcDiff < 0) utcDiff = utcDiff + 24 
        return utcDiff
    })
    // When sending an authenicated request, we reccomend using a Student's `request` method, as it will automaticly send the `token` param.
    .factory('PlanHWRequest', function($http, $q){
        var requestSender = function(path, method, data, params){
            return $q(function(resolve, reject){
                var req = {
                    method: method,
                    url: PlanHWApi + path
                }
                req.params = params;
                req.data = data;
                $http(req).then(function(res){
                    resolve(res)
                }, function(res){
                    reject(res)
                });
            });
        }
        requestSender.get = function(path, data){
            return requestSender(path, 'GET', null, data)
        }
        requestSender.post = function(path, data){
            return requestSender(path, 'POST', data)
        }
        return requestSender;
    })
    // All students are stored with this object
    .factory('Student', function(PlanHWRequest, webStorage, Homework, $q, DigestTimes){
        var Student = function(token, data, remember){
            if(remember){
                webStorage.remove('student')
                webStorage.add('student', {token: token, student: data})
            }
            
            this.authenicated = !!token;
            if(this.authenicated){
                this.token = token;
            }
            this.username = data.username
            this.id = data.id
            this.name = data.name
            this.firstName = this.name.split(' ')[0]
            this.admin = data.admin
            this.pro = data.pro
            this.avatarUrl = data.avatar
            this.friends = data.friends
            this.digestTime = DigestTimes[data.digestTime]
            this._week = 0
            
            this.setWeek = function(val){
                this._week += val;
                this.refreshHomework(true)
            }
            
            this.View = 'list'
            this.view = function(view){
                this.View = view;
            }
            
            this.stats = data.stats
            
            this.avatar = function(size){
                 return this.avatarUrl + "&s=" + ((size)? size : '250')
            }
            
            this.calcTimeLeft = function(){
                this.timeLeft = eval(this.homework.map(function(homework){
                    return homework.completed ? 0 : homework.estimatedTime.left
                }).join(' + '))
                this.timeLeft = {
                    seconds: Math.round(this.timeLeft % 60),
                    minutes: Math.floor(this.timeLeft / 60)
                }
            }
            
            this.reward = null;
            
            var request = function(path, method, data, params){
                params = params || {}
                params.token = this.token;
                return PlanHWRequest(path, method, data, params);
            
            }.bind(this)
            request.get = function(path, data){
                return request(path, 'GET', null, data)
            }.bind(this)
            request.post = function(path, data, params){
                return this.request(path, 'POST', data, params)
            }.bind(this)
            request.put = function(path, data){
                return this.request(path, 'PUT', data)
            }.bind(this)
            request.delete = function(path, data){
                return this.request(path, 'DELETE', data)
            }.bind(this)
            this.request = request
            
            if(this.friends){
                this.friends = this.friends.map(function(friend){
                    return new Student(null, friend.student)
                })
                this.friends.sifter = new Sifter(this.friends);
            }
            if(this.authenicated){
                this.request.get('test/login').then(function(res){
                    this.hasPaymentInfo = res.data.student.hasPaymentInfo
                }.bind(this))
            }
            this.refreshHomework = function(complete){
                return $q(function(resolve, reject){
                    $q(function(resolve, reject){
                        if(this.authenicated){
                            this.request.get('hw', {
                                incomplete: (complete)? 0 : 1,
                                week: this._week
                            }).then(function(res){
                                if(res.data.homeworks){
                                    resolve(res.data)
                                } else {
                                    this.doneWithHomework = true;
                                    resolve()
                                }
                            }.bind(this), function(res){
                                reject({error: 'offline', message: 'You are offline.'})
                            })
                        } else {
                            reject({error: 'not_authenicated', message: 'Please login first.'})
                        }
                    }.bind(this)).then(function(data){
                        if(!data){
                            resolve()
                            return;
                        }
                        this.homework = data.hw; // Homework list
                            this.week = data.week; // Week
                              this.hw = data.homeworks; //Homework objects
                              
                        for(var id in this.hw){
                            this.hw[id] = new Homework(this, this.hw[id].homework);
                            if(!this.hw[id].completed) this.doneWithHomework = false;
                        }
                        
                        this.homework = this.homework.map(function(id){
                            return this.hw[id]
                        }, this)
                        
                        this.calcTimeLeft()
                        
                        if(this.week) {
                            var i = 0;
                            var del = []
                            this.weekRight = []
                            this.weekLeft = [] 
                            this.week.forEach(function(day, i){
                                day.moment = moment(day.day.iso, moment.ISO_8601)
                                day.moment.day(day.moment.day()+1)
                                day.isToday = day.moment.isSame(moment(), 'day')
                                day.homework = day.homework.map(function(id){
                                    return this.hw[id];
                                }, this);
                                if(i / 3 >= 1){
                                    this.weekRight.push(day);
                                } else {
                                    this.weekLeft.push(day);
                                }
                            }, this);
                        }
                        
                        resolve(this.homework)
                        if(!complete) this.refreshHomework(true)
                    }.bind(this), function(data){
                        if(data.error == 'not_authenicated'){
                            this.token = null;
                            this.authenicated = false;
                        }
                        reject(data)
                    }.bind(this))
                }.bind(this))
            }
            this.update = function(){
                return this.request.put('students', this.raw()).then(function(){
                    student = webStorage.remove('student')
                    return true;
                }, function(){
                    return false;
                });
            }
            this.raw = function(){
                this.digestTime = this.digestTime.utc
                var raw = {
                    token: this.token,
                    username: this.username,
                    name: this.name,
                    password: this.password,
                    password_confirm: this.password_confirm,
                    id: this.id,
                    pro: this.pro,
                    admin: this.admin,
                    habitica: this.habitica,
                    digestTime: this.digestTime,
                    writing_pph: this.stats.writingPph,
                    reading_wpm: this.stats.readingWpm,
                    math_homework_time: this.stats.mathHomeworkTime,
                    avg_assignment_time: this.stats.avgAssignmentTime,
                    words_per_writing_page: this.stats.wordsPerWritingPage,
                    words_per_reading_page: this.stats.wordsPerReadingPage,
                    chapter_size: this.stats.chapterSize,
                    avg_pages: this.stats.avgPages,
                }
                
                return raw
            }
        }
        Student.build = function(student, token){
            return new Student(token, student)
        }
        Student.build.token = function(token, remember){
            return PlanHWRequest.get('test/login', {token: token}).then(function(res){
                data = res.data;
                return new Student(token, data.student, remember);
            })
        };
        Student.build.id = function(id){
            return PlanHWRequest.get('students/' + id).then(function(res){
                data = res.data;
                return new Student(null, data.student)
            })
        };
        Student.build.login = function(username, password, remember, otp){
            return PlanHWRequest.get('login', {
                username: username,
                password: password,
                auth_code: otp
            }).then(function(res){
                data = res.data;
                return {error: false, student: new Student(res.data.token, res.data.student, remember)};
            }, function(res){
                data = res.data;
                if(res.status == 401){
                    if(data === 'Please include OTP.'){
                        return {error: 'incorrect_otp', message: 'Please include a correct one time passcode (from Google Authenicator)'}
                    } else {
                        return {error: 'incorrect_login', message: 'Wrong username/password'}
                    }
                } else {
                    return {error: 'unknown_error', message: 'Failed to login.'}
                }
            })
        }
    
        return Student;
    })
    .factory('Flash',function($q, $rootScope){
        var flashes = []
        $rootScope.$on('$routeChangeSuccess', function () {
            $rootScope.flashesNow = flashes;
            flashes.forEach(function(flash){
                flash.callback();
            })
            flashes = [];
        });
        return function(message, type, now){
            return $q(function(resolve, reject){
                if(now){
                    $rootScope.flashesNow.push({message: message, class: type})
                    resolve(message);
                } else {
                    flashes.push({message: message, class: type, callback: function(){
                        resolve(message)
                    }});
                }
            })
        }
    })
    .factory('Homework',function($q, $Kiip){
        var Homework = function(student, data){
            this.student = student;
            this.deleted = false;
            this.timer = null;
            this.moment = function(){
                return moment(this.dueDate);
            }
            this.dueDateWords = function(onlyTime){
                if(onlyTime){
                    return this.moment().format("h:mm A")
                } else {
                    return this.moment().calendar();
                }
            }
            this.updateDescription = function(description){
                this.description = description || this.description || "";
                this.descHTML = marked(this.description)
            }
            this.calcTimes = function(noStudentCalc){
                this.estimatedTime.spentTotal = this.estimatedTime.spent + this.estimatedTime.spentNow
                this.estimatedTime.left = this.estimatedTime.raw - this.estimatedTime.spentTotal + this.estimatedTime.added;
                this.estimatedTime.percent = this.estimatedTime.spentTotal / (this.estimatedTime.left + this.estimatedTime.spentTotal) * 100;
                this.estimatedTime.roundedPercent = Math.round(this.estimatedTime.percent);
                this.estimatedTime.seconds = Math.round(this.estimatedTime.left % 60),
                this.estimatedTime.minutes = Math.floor(this.estimatedTime.left / 60)
                if(!noStudentCalc) this.student.calcTimeLeft()
            }
            if(data){
                this.id = data.id;
                this.completed = data.completed;
                this.title = data.title;
                this.dueDate = moment(data.dueDate).toISOString();
                this.createdAt = data.createdAt;
                
                this.estimatedTime = {
                    left: data.estimatedTimeLeft,
                    spent: data.timeSpent,
                    spentNow: 0,
                    raw: data.estimatedTime,
                    added: data.additionalTime || 0,
                    spent: data.timeSpent || 0
                };
                
                this.calcTimes(true)
                this.updateDescription(data.description)
            }
        }
        Homework.Input =  function(input, student){
            var homework = new Homework(student)
            
            homework.completed = false;
            homework.input = input;
            homework.updateDescription((homework.input.match(/\((.+)\)/i))? homework.input.match(/\((.+)\)/i)[1] : "")
            var date;
            chrono.parse(homework.input).forEach(function(match){
                date = match
            });
            homework.dueDate = moment(chrono.parseDate(homework.input));
            if(!homework.dueDate.isValid()){                 
                homework.dueDate = moment().add('1','d')
            }
            homework.title = homework.input.replace(/\((.+)\)/i, "")
            if(date){
                homework.title = homework.title.replace("due "+date.text,'').replace(date.text,'');
            }
            if(student && student.friends && student.friends.sifter){
                var sifter = student.friends.sifter
                if(homework.input.length < 3){
                    homework.shareSuggest = null
                } else {
                    homework.input.split(' ').forEach(function(word){
                        var results = sifter.search(word, {
                            fields: ['username','firstName'],
                            sort: [{field: 'name', direction: 'asc'},{field: 'username', direction: 'asc'}],
                            limit: 1
                        });
                        var result = results.items[0]
                        if(result && result.score >= .45 && (word.length > 3 || word === student.friends[result.id].firstName)){
                            homework.shareSuggest = friends[result.id]
                        }
                    })
                }
            }
            homework.estimatedTime = {human: "Unknown"}
            return homework
        }
        
        //Deletes a homework from the server, and sets the local deleted variable to true - you can still recreate it.
        Homework.prototype.delete = function(){
            this.deleted = true;
            return this.student.request.delete('hw/'+this.id).then(function(){
                this.deleted = true;
            }.bind(this),function(data){
                //something went wrong - do something
                this.deleted = false;
                this.editing = false;
            })
        }
        //Send homework object to the server.
        //This function returns a promise with the homework object that the server returned, or error messages.
        //If `add` is true, then the homework object will be added to the student it belongs to.
        Homework.prototype.create = function(add, shareFriend){
            var params = {}
            if(shareFriend) params['friend_id'] = shareFriend.id;
            var hw_data = {
                title: this.title.trim(),
                description: this.description || "",
                due_date: this.moment().toISOString(),
                estimated_time: (this.estimated_time)? (this.estimated_time_min || 0) * 60 + (this.estimated_time_sec || 0) : false
            }
            return this.student.request.post('hw', hw_data, params).then(function(res){
                var homework = new Homework(shareFriend || this.student, res.data.homework)
                if(add) this.student.homework.unshift(homework);
                
                this.estimatedTime = {
                    left: hw_data.estimatedTime,
                    spent: 0,
                    spentNow: 0,
                    raw: hw_data.estimatedTime,
                    added: 0
                };
                
                this.calcTimes();
                return homework;
            }.bind(this), function(res){
                return {error: true, errors: res.data['errors']}
            })
        }
        //Tells the api to create a homework object based on this one (title, description, and due date).
        //Then, it changes the id of this one to match the new homework object, and falsifies the editing and deleted properties.
        Homework.prototype.recreate = function(){
            this.create().then(function(homework){
                this.id = homework.id;
                this.deleted = false;
                this.editing = false;
            }.bind(this))
        }
        //Turns off editing, and then sends a request to the server to update title,
        //description, and completed to its current properties.
        //Aliases: `update`
        Homework.prototype.save = function(changedDueDate){
            this.editing = false;
            var updateData = {
                title: this.title.trim(),
                description: this.description,
                completed: this.completed,
                time_spent: this.estimatedTime.spentNow
            }
            return this.student.request.put('hw/'+this.id, updateData).then(function(res){
            }, function(res){
                this.editing = true;
                return {error: true, message: res.data}
            })
        }
        Homework.prototype.addTime = function(sec){
            return this.student.request.put('hw/'+this.id, {additional_time: sec}).then(function(res){
                this.estimatedTime.added += sec;
                this.calcTimes();
            }.bind(this))
        }
        //Alias for `save`
        Homework.prototype.update = Homework.prototype.save;
        //Toggles the `completed` attribute, and calls the `save` function.
        Homework.prototype.complete = function(){
            if(this.completed){
                this.student.doneWithHomework = false;
                this.completed = false;
            } else {
                this.completed = true;
                if(!this.student.homework.map(function(homework){
                    return homework.completed
                }).includes(false)){
                    this.student.doneWithHomework = true;
                }
                $Kiip.postMoment('completing_homework');
            }
            this.save();
        }
        return Homework
    })
    .factory('$Kiip', function($rootScope){
        return new Kiip("cb2287b6701a25fef68728ece8d7875f", function(unit){
            if (unit) {
                unit.show(function(){
                    $rootScope.student.reward = null;
                    $rootScope.$apply();
                });
                $rootScope.student.reward = unit;
                $rootScope.$apply();
            }
        });
    });
 })();