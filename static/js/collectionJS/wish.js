
function customConfirm(message) {
    return new Promise((resolve) => {
        const confirmBox = document.getElementById("customConfirm");
        const confirmMessage = document.getElementById("confirmMessage");
        const confirmYes = document.getElementById("customConfirmYes");
        const confirmNo = document.getElementById("customConfirmNo");
        
        const confirmContent = document.querySelector('.confirm-content');
        confirmContent.style.transform = 'translateY(-200px)';
        setTimeout(() => {
            confirmContent.style.transform = 'translateY(0)';
        }, 10);
        confirmMessage.textContent = message;
        confirmBox.style.display = "block";

        confirmYes.onclick = () => {
            confirmBox.style.display = "none";
            resolve(true);
        };

        confirmNo.onclick = () => {
            confirmBox.style.display = "none";
            resolve(false);
        };
    }
    )
};

document.getElementById("useWish").addEventListener("click", async () => {
    if (wish >= 7) {
        // Show the circular wish interface
        document.getElementById('wishCarousel').style.display = 'flex';
        
        // Handle click on the circle to activate the wish
        document.querySelector('.wish-circle').onclick = () => {
            // Start 5-minute income boost
            incomeWishActive = true;
            incomeWishEndTime = Date.now() + WISH_DURATION;
            wish -= 7;
            save();
            
            // Hide the carousel
            document.getElementById('wishCarousel').style.display = 'none';
            
            // Maybe show a confirmation message
            console.log("Income boost activated for 5 minutes!");
        };
    } else {
        await customConfirm(`Not enough wishes to grant a wish. (${wish} / 7)`);
    }
});
