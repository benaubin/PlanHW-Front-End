if(($(location).attr('hostname').match(/^.+?\.\D+?$/i) || $(location).attr('hostname').match(/dev/i) || confirm("Use production API?"))){
    var PlanHWApi = "https://api.planhw.com/"
} else {
    var PlanHWApi = "http://localhost:3000/"
}

Offline.options = {checks: {xhr: {url: PlanHWApi}}};

addToHomescreen();

(function(){
angular.module('PlanHW', ['ngRoute','ui.bootstrap.datetimepicker','webStorageModule','ngSanitize'])
    .config(function($routeProvider) {
        
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
    .controller('LoginCtrl',function(Student, $rootScope, $routeParams){
        Student.build.token($routeParams.token, true).then(function(student){
            $rootScope.student = student
        });
    })
    .controller('FlashCtrl',function($rootScope,$routeParams,$location){
        var message = decodeURIComponent($routeParams.message)
        $rootScope.flashes.push({class:'info', message: message})
        var page = decodeURIComponent($routeParams.page)
        if(page === 'root') page = ''
        $location.path('/' + page)
    })
    .controller('SettingsCtrl',function($rootScope,$scope,$routeParams,$http,$sce,$location, PlanHWRequest){
        $scope.getPro = function(cc,cvc,expMonth,expYear,plan,coupon){
            if(cc && cvc){
                Stripe.card.createToken({
                    number: cc,
                    cvc: cvc,
                    exp_month: expMonth,
                    exp_year: expYear
                }, function(status,token){
                    $http.post(PlanHWApi+'pro',{
                        source: token,
                        plan: plan,
                        token: $rootScope.student_token,
                        coupon: coupon
                    }).success(function(){
                        $rootScope.flashes.push({class: 'success', message: 'Congrats! You now have PlanHW Pro!'})
                        $rootScope.signout.pro = true;
                    }).error(function(data){
                        $scope.show('pro')
                        $rootScope.flashesNow.push({class:'danger', message: data.error.message})
                    });
                })
            } else {
                $http.post(PlanHWApi+'pro',{
                    plan: plan,
                    coupon: coupon,
                    token: $rootScope.student_token
                }).success(function(){
                    $rootScope.flashes.push({class: 'success', message: 'Congrats! You now have PlanHW Pro!'})
                    $rootScope.signout.pro = true;
                }).error(function(data){
                    $scope.show('pro')
                    $rootScope.flashesNow.push({class:'danger', message: data.error.message})
                });
            }
        }
        $scope.getRidOfPro = function(){
            if(confirm('Just making sure you know what you are doing -- this will get rid of your pro status on PlanHW IMMEDIATELY') && (prompt('Please confirm your username') === $rootScope.student.username)){
                Student.request.delete(pro).then(function(){
                    $rootScope.flashes.push({class: 'danger', message: ':( - We got rid of your pro membership.'})
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
                $rootScope.flashes.push({class:'success', message: "Sent friend request."})
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
    .run(function($rootScope, PlanHWRequest, $location, webStorage, Student){
        $rootScope.flashes = []
        $rootScope.flashesNow = []
        $rootScope.$on('$routeChangeSuccess', function () {
            $rootScope.flashesNow = $rootScope.flashes
            $rootScope.flashes = []
            try {
                $('.modal').modal('hide');
            } catch(err){}
        });
        $rootScope.signout = function(location){
            $rootScope.student = null
            $location.path(location || '/')
            webStorage.remove('student')
        }
        PlanHWRequest.get('pro').then(function(res){
            Stripe.setPublishableKey(res.data)
        })
        if(webStorage.has('student')){
            console.log(webStorage.get('student'))
            student = webStorage.get('student')
            $rootScope.student = Student.build(student.student, student.token)
        }
    })
    .controller('IndexCtrl',function($scope, Homework){
        $scope.people = 'Students'
        $scope.hwinput = Homework.Build.Input;
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
    .controller('HWCtrl',function($scope, $rootScope, $location, webStorage, Student, Homework){
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
                $rootScope.flashes.push({class: "danger", message: error.message})
                $location.path('/')
            })
        }
        $scope.suggestShareFriend = null
        $scope.input = function(homework){
            $scope.homework = Homework.Build.Input(homework.input, $rootScope.student)
            $scope.suggestShareFriend = homework.shareSuggest
        };
        $scope.new = function(homework){
            homework.create(true).then(function(newHomework){
                if(newHomework.error){
                    //TODO: do something
                } else {
                    $scope.homework = null
                }
            })
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
        
    })
    .controller('SigninCtrl', function($scope, Student, $rootScope, $location, $httpParamSerializer){
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
                    $rootScope.flashes.push({message: "Welcome back to PlanHW!", class: 'success'})
                    $location.path('/homework');
                }
            })
        }
        $scope.signinToken = function(token){
            Student.build.token(token, true).then(function(student){
                $rootScope.student = student
                $rootScope.flashes.push({message: "Welcome back to PlanHW!", class: 'success'})
                $location.path('/homework');
            })
        }
        $scope.gsigninURL = 
                "https://accounts.google.com/o/oauth2/auth?" + $httpParamSerializer({
                        scope: ['openid email'].join(' '),
                        state: 'google',
                        redirect_uri: PlanHWApi + 'oauth2callback',
                        response_type: 'code',
                        client_id: "179836333485-a9u3omrs9o0c1ik00fesa2043q0f63fe.apps.googleusercontent.com"
                    })
    })
    .controller('ForgotPassCtrl',function($scope, $http, $rootScope, $location){
        $scope.changePass = function(){
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
    .factory('Student', function(PlanHWRequest, webStorage, Homework, $q){
        var Student = function(token, id, username, name, admin, pro, avatarUrl, friends){
            this.authenicated = !!token;
            if(this.authenicated){
                this.token = token
            }
            this.username = username
            this.id = id
            this.name = name
            this.firstName = this.name.split(' ')[0]
            this.admin = admin
            this.pro = pro
            this.avatarUrl = avatarUrl
            this.friends = friends
            
            this.avatar = function(size){
                 return this.avatarUrl + "&s=" + ((size)? size : '250')
            }
            
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
                    return Student.build(friend.student, false, false)
                })
                this.friends.sifter = new Sifter(friends);
            }
            if(this.authenicated){
                this.request.get('test/login').then(function(res){
                    this.hasPaymentInfo = res.data.student.hasPaymentInfo
                }.bind(this))
            }
            this.doneWithHomework = true;
            this.refreshHomework = function(complete){
                return $q(function(resolve, reject){
                    $q(function(resolve, reject){
                        if(this.authenicated){
                            this.request.get('hw', {
                                incomplete: (complete)? 0 : 1
                            }).then(function(res){
                                var homework = res.data.homeworks;
                                webStorage.remove('hw')
                                if(webStorage.has('student')) webStorage.add('hw', homework)
                                resolve(homework)
                            }, function(res){
                                if(webStorage.get('hw')){
                                    console.warn("You are offline - using stored copy of homework.")
                                    resolve(webStorage.get('hw'))
                                } else {
                                    reject({error: 'offline', message: 'You are offline.'})
                                }
                            })
                        } else {
                            reject({error: 'not_authenicated', message: 'Please login first.'})
                        }
                    }.bind(this)).then(function(homework){
                        this.homework = homework.map(function(homework){
                            homework = Homework.Build(homework.homework, this)
                            if(!homework.completed) this.doneWithHomework = false
                            return homework
                        }, this).sort(function(x, y) {
                            x = x.completed
                            y = y.completed
                            return (x === y)? 0 : x? 1 : -1;
                        })
                        resolve(this.homework)
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
                    return true;
                }, function(){
                    return false;
                });
            }
            this.raw = function(){
                var raw = {
                    token: this.token,
                    username: this.username,
                    name: this.name,
                    password: this.password,
                    password_confirm: this.password_confirm,
                    id: this.id,
                    pro: this.pro,
                    admin: this.admin,
                    habitica: this.habitica
                }
                return raw
            }
        }
        Student.build = function(data, token, remember){
            if(remember){
                webStorage.remove('student')
                webStorage.add('student', {token: token, student: data})
            }
            return new Student(token, data.id, data.username, data.name, data.admin, data.pro, data.avatar.default, data.friends)
        };
        Student.build.token = function(token, remember){
            return PlanHWRequest.get('test/login', {token: token}).then(function(res){
                data = res.data;
                return Student.build(data.student, token, remember);
            })
        };
        Student.build.id = function(id){
            return PlanHWRequest.get('students/' + id).then(function(res){
                data = res.data;
                return Student.build(data.student)
            })
        };
        Student.build.login = function(username, password, remember, otp){
            return PlanHWRequest.get('login', {
                username: username,
                password: password,
                auth_code: otp
            }).then(function(res){
                data = res.data;
                return {error: false, student: Student.build(res.data.student, res.data.token, remember)};
            }, function(res){
                data = res.data
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
    .factory('Homework',function($q){
        var Homework = function(student, id, completed, title, description, due_date, created_at, updated_at){
            this.id = id;
            this.completed = completed;
            this.title = title;
            this.dueDate = moment(due_date).toISOString();
            this.createdAt = created_at;
            this.student = student;
            this.deleted = false;
            
            this.moment = function(){
                return moment(this.dueDate);
            }
            this.dueDateWords = function(){
                return this.moment().calendar();
            }
            
            this.updateDescription = function(description){
                this.description = description || this.description || "";
                this.descHTML = marked(this.description)
            }
            
            this.updateDescription(description)
        }
        var BuildHomework = function(data, student){
            return new Homework(student, data.id, data.completed, data.title, data.description, data.due_date, data.created_at, data.updated_at)
        }
        Homework.Build = BuildHomework;
        Homework.Build.Input = function(input, student){
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
            if(shareFriend){
                params['friend_id'] = shareFriend.id
            }
            return this.student.request.post('hw', {
                title: this.title.trim(),
                description: this.description || "",
                due_date: this.moment().toISOString()
            }, params).then(function(res){
                if(add) this.student.homework.shift();
                var homework = BuildHomework(res.data.homework, shareFriend || this.student)
                if(add) this.student.homework.unshift(homework);
                return homework;
            }.bind(this), function(data){
                if(add) this.student.homework.shift();
                return {error: true, type: data['message']['type'], errors: data['message']['errors']}
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
                completed: this.completed
            }
            this.student.request.put('hw/'+this.id, updateData).then(function(res){
            }, function(res){
                this.editing = true;
                return {error: true, message: res.data}
            })
        }
        //Alias for `save`
        Homework.prototype.update = Homework.prototype.save;
        //Toggles the `completed` attribute, and calls the `save` function.
        Homework.prototype.complete = function(){
            this.completed = !this.completed
            this.save();
        }
        return Homework
    })
;})();