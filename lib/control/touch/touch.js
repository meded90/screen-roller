(function($) {
    var MODULE_NAME = 'touch';
    var PLAGIN_NAME = 'screenroller' + '-' + MODULE_NAME;
    var MODULE_TYPE = 'control';

    var INNER_EVENT_TOUCH_START = 'touch-start';
    var INNER_EVENT_TOUCH_MOVE = 'touch-move';
    var INNER_EVENT_TOUCH_END = 'touch-end';

    var INNER_EVENT_REQUEST_MOVE = 'request-move';
    var INNER_EVENT_RESTORE_OFFSET = 'restore-offset';

    var EVENT_MOUSE_DOWN = 'mousedown.' + MODULE_NAME;
    var EVENT_MOUSE_MOVE = 'mousemove.' + MODULE_NAME;
    var EVENT_MOUSE_UP = 'mouseup.' + MODULE_NAME;
    var EVENT_MOUSE_LEAVE = 'mouseleave.' + MODULE_NAME;

    var EVENT_TOUCH_START = 'touchstart.' + MODULE_NAME;
    var EVENT_TOUCH_MOVE = 'touchmove.' + MODULE_NAME;
    var EVENT_TOUCH_END = 'touchend.' + MODULE_NAME;
    var EVENT_TOUCH_CANSEL = 'touchcancel.' + MODULE_NAME;

    var DEFAULT_OPTIONS = {
        mouseEmulate: true
    };

    var _addListeners = function() {
        var module = this;
        var $wrap = module.core.$wrap;

        $wrap.on(EVENT_TOUCH_START, function(e) {
            _processTouchStart.call(module, e);
        });

        $wrap.on(EVENT_TOUCH_MOVE, function(e) {
            _processTouchMove.call(module, e);
            return false;
        });

        $wrap.on(EVENT_TOUCH_END, function(e) {
            _processTouchEnd.call(module, e);
        });

        $wrap.on(EVENT_TOUCH_CANSEL, function(e) {
            _processTouchEnd.call(module, e);
        });

        if(module.mouseEmulate) {
            $wrap.on(EVENT_MOUSE_DOWN, function(e) {
                module.isMouseDown = true;
                _processTouchStart.call(module, e);
            });

            $wrap.on(EVENT_MOUSE_MOVE, function(e) {
                if(module.isMouseDown) {
                    _processTouchMove.call(module, e);
                }
            });

            $wrap.on(EVENT_MOUSE_UP, function(e) {
                if(module.isMouseDown) {
                    _processTouchEnd.call(module, e);
                    module.isMouseDown = false;
                }
            });

            $wrap.on(EVENT_MOUSE_LEAVE, function(e) {
                if(module.isMouseDown) {
                    _processTouchEnd.call(module, e);
                    module.isMouseDown = false;
                }
            });
        }
    };

    var _removeListeners = function() {
        var $wrap = this.core.$wrap;

        $wrap.off(EVENT_TOUCH_START);
        $wrap.off(EVENT_TOUCH_MOVE);
        $wrap.off(EVENT_TOUCH_END);
        $wrap.off(EVENT_TOUCH_CANSEL);

        if(this.mouseEmulate) {
            $wrap.off(EVENT_MOUSE_DOWN);
            $wrap.off(EVENT_MOUSE_MOVE);
            $wrap.off(EVENT_MOUSE_UP);
            $wrap.off(EVENT_MOUSE_LEAVE);
        }
    };

    var _processTouchStart = function(e) {
        var module = this;
        var $el = module.core.$el;

        module.lastMovement = '';
        module.startPoint = _getcurrentPoint.call(this, e);

        $el.trigger(INNER_EVENT_TOUCH_START, {
            initiator: MODULE_NAME,
            startPoint: module.startPoint,
            event: e,
            unique: module.core.unique
        });
    };

    var _processTouchMove = function(e) {
        var module = this;
        var $el = this.core.$el;
        var currentPoint = _getcurrentPoint.call(this, e);
        var lastPoint = this.lastPoint || currentPoint;
        var startPoint = this.startPoint;
        var offset = startPoint - currentPoint;

        this.lastMovement = _getMoveDirection.call(this, lastPoint, currentPoint);
        this.lastPoint = currentPoint;

        $el.trigger(INNER_EVENT_TOUCH_MOVE, {
            initiator: MODULE_NAME,
            offset: offset,
            event: e,
            unique: module.core.unique
        });
    };

    var _processTouchEnd = function(e) {
        var module = this;
        var $el = this.core.$el;


        var startPoint = this.startPoint;
        var finishPoint = this.lastPoint;

        //if lastPoint is empty then it was tap
        if(!finishPoint) {
            return;
        }

        //if touchemove ~ tap then restore
        var diff = startPoint - finishPoint;
        if(diff > 0) {
            //todo move 4 in params
            if(diff < 4) {
                $el.trigger(INNER_EVENT_RESTORE_OFFSET, {
                    initiator: MODULE_NAME,
                    unique: module.core.unique
                });
            }
        } else {
            if(diff > -4) {
                $el.trigger(INNER_EVENT_RESTORE_OFFSET, {
                    initiator: MODULE_NAME,
                    unique: module.core.unique
                });
            }
        }

        var generalMovement = _getMoveDirection.call(this, startPoint, finishPoint);
        var lastMovement = this.lastMovement || generalMovement;

        delete this.startPoint;
        delete this.lastPoint;

        $el.trigger(INNER_EVENT_TOUCH_END, {
            generalMovement: generalMovement,
            lastMovement: lastMovement,
            event: e,
            initiator: MODULE_NAME
        });

        if(generalMovement !== lastMovement) {
            $el.trigger(INNER_EVENT_RESTORE_OFFSET, {
                initiator: MODULE_NAME,
                unique: module.core.unique
            });
        }

        if(generalMovement === lastMovement) {
            var current = this.core.currentScreen;
            var count = this.core.countScreens;

            var currentIsFirst = (current === 0);
            var currentIsLast = (current === count - 1);

            if(generalMovement === 'next' && !currentIsLast) {
                return $el.trigger(INNER_EVENT_REQUEST_MOVE, {
                    direction: 'next',
                    initiator: MODULE_NAME,
                    unique: module.core.unique
                });
            }

            if(generalMovement === 'prev' && !currentIsFirst) {
                return $el.trigger(INNER_EVENT_REQUEST_MOVE, {
                    direction: 'prev',
                    initiator: MODULE_NAME,
                    unique: module.core.unique
                });
            }

            $el.trigger(INNER_EVENT_RESTORE_OFFSET, {
                initiator: MODULE_NAME,
                unique: module.core.unique
            });
        }
    };

    var _getMoveDirection = function(startPoint, endPoint) {
        if(startPoint === endPoint) {
            return this.lastMovement;
        }

        return endPoint < startPoint ? 'next' : 'prev';
    };

    var _getcurrentPoint = function(e) {
        var axis = this.core.options.axis;

        return e[ 'originalEvent' ][ 'page' + axis.toUpperCase() ] ||
               e[ 'originalEvent' ].changedTouches[ 0 ][ 'page' + axis.toUpperCase() ]; //android chrome
    };

    function Touch(params) {
        var options = $.extend(true, {}, DEFAULT_OPTIONS, params.options);

        this.core = params.roller;
        this.type = MODULE_TYPE;
        this.mouseEmulate = options.mouseEmulate;
        this.enable();
    }

    Touch.prototype.enable = function() {
        _addListeners.call(this);
        this.enabled = true;
    };

    Touch.prototype.disable = function() {
        _removeListeners.call(this);
        this.enabled = false;
    };

    Touch.prototype.destruct = function() {
        _removeListeners.call(this);
        delete this.core.modules[ MODULE_NAME ];
    };

    $.fn[ PLAGIN_NAME ] = function(options) {
        this.roller.modules[ MODULE_NAME ] = new Touch({
            roller: this.roller,
            options: options
        });

        return this;
    };
}(jQuery));