"use strict";
var AddController = function($http, $log, $rootScope, $scope, $timeout, $window, capabilities, navigation, persistentStorage, resourceCache) {

	var capitalizeWords = function(str) {
		var result = "";
		var words = str.split(" ");
		for (var i = 0; i < words.length; i++) {
			var word = words[i];
			word = word.charAt(0).toUpperCase() + word.slice(1);
			if (i !== 0) {
				word = " " + word;
			}
			result += word;
		}
		return result;
	};

	var resetScope = function() {
		$scope.hike = {};
		$scope.hike.location = {};
		$scope.isLoaded = false;
		$scope.isSubmitted = false;
		$scope.prepopulatedName = null;
	};
	resetScope();

	$rootScope.$on("$locationChangeStart", function (event, next, current) {
		resetScope();
	});
	$scope.$on("prepopulateAddHikeName", function(event, name) {
		if (capabilities.isPrepopulatingFormsSupported) {
			$scope.prepopulatedName = capitalizeWords(name);
		}
	});
	$scope.$on("fancyboxLoaded", function() {
		$scope.$apply(function() {
			$scope.isLoaded = true;
			$scope.hike.name = $scope.prepopulatedName;
		});
	});
	$scope.$on("fancyboxClosed", function() {
		// http://stackoverflow.com/questions/12729122/prevent-error-digest-already-in-progress-when-calling-scope-apply
		if(!$scope.$$phase) {
			$scope.$apply(function() {
				resetScope();
			});
		} else {
			resetScope();
		}
	});

	$scope.attemptSubmit = function() {
		$scope.isSubmitted  = true;
	};

	$scope.add = function() {
		$http({method: "POST", url: "/api/v1/hikes", data: $scope.hike}).
			success(function(data, status, headers, config) {
				var id = "";
				if (status === 202) {
					id = headers("Hikeio-Hike-String-Id");
					$scope.hike.string_id = id;
					persistentStorage.set("/api/v1/hikes/" + id, $scope.hike);
				} else if (status === 200) {
					id = data.string_id;
					$scope.hike = data;
				}
				// Keep this hike in the user's session cache (even in the case when the add is under review, otherwise
				// the redirect to the entry page would fail)
				resourceCache.put("/api/v1/hikes/" + $scope.hike.string_id, jQuery.extend(true, {}, $scope.hike));
				if (capabilities.isEditPageSupported) {
					navigation.toEntryEdit(id);
				} else {
					$rootScope.$broadcast("fancyboxClose");
					if (status === 202) {
						$window.alert("Nice! Your change is being reviewed and will be live soon.");
					}
					navigation.toEntry(id);
				}
				resetScope();
				$timeout(function() {
					var isBeingReviewed = (status === 202);
					$rootScope.$broadcast("hikeAdded", $scope.hike, isBeingReviewed);
				});
			}).
			error(function(data, status, headers, config) {
				$log.error(data, status, headers, config);
			}
		);
	};
	$scope.htmlReady();
};

AddController.$inject = ["$http", "$log", "$rootScope", "$scope", "$timeout", "$window", "capabilities", "navigation", "persistentStorage", "resourceCache"];