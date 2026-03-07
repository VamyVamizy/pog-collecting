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
        document.getElementById('wishCarousel').style.display = 'flex';

        document.querySelector('.wish-container').onclick = () => {
            // Check which wish is currently selected
            const currentWish = wishTypes[currentWishIndex];
            
            if (currentWish.type === "income") {
                // Income boost
                incomeWishActive = true;
                incomeWishEndTime = Date.now() + WISH_DURATION;
                showSuccessMessage("Income Boost Activated! +30% income for 5 minutes");
            } else if (currentWish.type === "droprate") {
                // Drop rate boost (for future implementation)
                dropRateWishActive = true;
                dropRateWishEndTime = Date.now() + WISH_DURATION;
                showSuccessMessage("Drop Rate Boost Activated! Better luck for 5 minutes");
                updateDropRateDisplay();
            } else if (currentWish.type === "clarity") {
                // Clarity boost
                clarityWishActive = true;
                clarityWishEndTime = Date.now() + WISH_DURATION;
                generateClarityPreviews();
                showSuccessMessage("Clarity Boost Activated! Next 5 crates revealed for 5 minutes");
            }
            
            wish -= 7;
            save();
            document.getElementById('wishCarousel').style.display = 'none';
        };
    } else {
        await customConfirm(`Not enough wishes to grant a wish. (${wish} / 7)`);
    }
});

function updateWishDisplay() {
    const currentWish = wishTypes[currentWishIndex]; // Fixed: changed wishData to wishTypes
    document.getElementById('wishIcon').src = currentWish.icon;
    document.getElementById('wishName').textContent = currentWish.name;
    document.getElementById('wishDescription').textContent = currentWish.description;
}

function slideToWish(direction) {
    const circle = document.querySelector('.wish-circle');
    const info = document.querySelector('.wish-info');
    
    circle.style.transform = 'translateX(-300px)';
    circle.style.opacity = '0';
    info.style.transform = 'translateX(-300px)';
    info.style.opacity = '0';
    
    setTimeout(() => {
        if (direction === 'right') {
            currentWishIndex = (currentWishIndex + 1) % wishTypes.length;
        } else {
            currentWishIndex = (currentWishIndex - 1 + wishTypes.length) % wishTypes.length;
        }
        
        updateWishDisplay();

        circle.style.transform = 'translateX(300px)';
        circle.style.opacity = '0';
        info.style.transform = 'translateX(300px)';
        info.style.opacity = '0';
        
        setTimeout(() => {
            circle.style.transform = 'translateX(0)';
            circle.style.opacity = '1';
            info.style.transform = 'translateX(0)';
            info.style.opacity = '1';
        }, 50);
    }, 250);
}


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('leftCursor').addEventListener('click', (e) => {
        e.stopPropagation();
        slideToWish('left');
    });
    
    document.getElementById('rightCursor').addEventListener('click', (e) => {
        e.stopPropagation();
        slideToWish('right');
    });
});