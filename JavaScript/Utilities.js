var toHex = function(str, rev){
    var result=[];
    var length=str.length;
    var c=0;
    while(c < length){
        
        if(rev)
        {
            result[length - c - 1] = str.charCodeAt(c++);
        }
        else
        {
            result[c] = str.charCodeAt(c++);
        }
    }
    return result;
};

var equals = function(array1, array2){
    if(array1 && array2 && array1.length == array2.length)
    {
        for(var x = 0; x < array1.length; x++)
        {
            if(array1[x] != array2[x])
            {
                return false;
            }
        }
        return true;
    }
    return false;
};

var hexToNumber = function(array){
    var result = 0;
    
    for(var x = 0; x < array.length; x++)
    {
        result += array[x] * Math.pow(256, ((array.length - x) - 1));
    }
    
    return result;
};

var hexToBinary = function(array){
    var result = [];
    
    for(var x = 0; x < array.length; x++)
    {
        result[x] = array[x].toString(2);
    }
    
    return result;
};